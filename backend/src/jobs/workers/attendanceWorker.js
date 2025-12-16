const { attendanceQueue } = require('../queues');
const attendanceService = require('../../services/attendanceService');
const analyticsService = require('../../services/analyticsService');
const { User, Attendance } = require('../../models');
const { notificationQueue, emailQueue } = require('../queues');
const logger = require('../../config/logger');
const moment = require('moment');

// Process attendance-related jobs
attendanceQueue.process(async (job) => {
  const { type, data } = job.data;

  logger. info(`Processing attendance job: ${type}`, { jobId: job.id });

  try {
    let result;

    switch (type) {
      case 'sendCheckInReminders':
        result = await sendCheckInReminders();
        break;

      case 'sendCheckOutReminders': 
        result = await sendCheckOutReminders();
        break;

      case 'markAbsent':
        result = await markAbsentUsers();
        break;

      case 'generateDailyReports':
        result = await generateDailyReports();
        break;

      case 'generateWeeklyReports':
        result = await generateWeeklyReports();
        break;

      case 'detectAnomalies':
        result = await detectAnomalies();
        break;

      default:
        throw new Error(`Unknown attendance job type: ${type}`);
    }

    logger.info(`Attendance job completed:`, result);
    return { success: true, result };
  } catch (error) {
    logger.error(`Attendance job failed:`, error);
    throw error;
  }
});

/**
 * Send check-in reminders to users who haven't checked in
 */
async function sendCheckInReminders() {
  const now = moment();
  const currentHour = now.hour();
  const currentMinute = now.minute();

  // Send reminders at 9:15 AM (15 minutes after expected start)
  if (currentHour !== 9 || currentMinute < 15 || currentMinute > 20) {
    return { skipped: true, reason: 'Not reminder time' };
  }

  const today = moment().startOf('day').toDate();

  // Get all active staff users
  const users = await User.find({ role: 'staff', isActive: true, trackingEnabled: true });

  let remindersSent = 0;

  for (const user of users) {
    // Check if user has checked in today
    const attendance = await Attendance.findOne({
      user: user._id,
      date: today
    });

    if (!attendance || ! attendance.checkIn. time) {
      // Send reminder
      await notificationQueue.add('checkInReminder', {
        type: 'checkInReminder',
        data: { userId: user._id }
      });
      remindersSent++;
    }
  }

  return { remindersSent, totalUsers: users.length };
}

/**
 * Send check-out reminders
 */
async function sendCheckOutReminders() {
  const now = moment();
  const currentHour = now.hour();
  const currentMinute = now.minute();

  // Send reminders at 6:00 PM (expected end time)
  if (currentHour !== 18 || currentMinute > 5) {
    return { skipped: true, reason: 'Not reminder time' };
  }

  const today = moment().startOf('day').toDate();

  const attendances = await Attendance.find({
    date: today,
    'checkIn.time': { $exists: true, $ne: null },
    'checkOut.time':  null
  }).populate('user');

  let remindersSent = 0;

  for (const attendance of attendances) {
    if (attendance.user && attendance.user.isActive) {
      await notificationQueue.add('checkOutReminder', {
        type:  'checkOutReminder',
        data: { userId: attendance. user._id }
      });
      remindersSent++;
    }
  }

  return { remindersSent, totalAttendances: attendances.length };
}

/**
 * Mark users as absent who haven't checked in by end of day
 */
async function markAbsentUsers() {
  const now = moment();
  const currentHour = now.hour();

  // Run at 11:59 PM
  if (currentHour !== 23) {
    return { skipped:  true, reason: 'Not end of day' };
  }

  const today = moment().startOf('day').toDate();

  // Get all active staff users
  const users = await User.find({ role: 'staff', isActive:  true });

  let markedAbsent = 0;

  for (const user of users) {
    const attendance = await Attendance.findOne({
      user: user._id,
      date: today
    });

    if (!attendance) {
      // Create absent record
      await Attendance.create({
        user: user._id,
        date: today,
        status: 'absent'
      });
      markedAbsent++;
    }
  }

  return { markedAbsent, totalUsers: users. length };
}

/**
 * Generate daily reports for managers
 */
async function generateDailyReports() {
  const now = moment();
  const currentHour = now.hour();

  // Generate at 7:00 PM
  if (currentHour !== 19) {
    return { skipped: true, reason: 'Not report time' };
  }

  const managers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true });

  const today = moment().startOf('day').format('YYYY-MM-DD');

  let reportsSent = 0;

  for (const manager of managers) {
    const overview = await attendanceService.getAttendanceOverview({
      date: today,
      department: manager.department
    });

    const reportData = {
      date: today,
      present: overview.checkedIn,
      absent: overview.notCheckedIn,
      late:  overview.late,
      onLeave: 0 // Calculate if needed
    };

    await emailQueue.add('dailyReport', {
      type: 'dailyReport',
      data: { manager, reportData }
    });

    reportsSent++;
  }

  return { reportsSent, totalManagers: managers.length };
}

/**
 * Generate weekly reports
 */
async function generateWeeklyReports() {
  const now = moment();
  const dayOfWeek = now.day();
  const currentHour = now. hour();

  // Generate on Monday at 9:00 AM
  if (dayOfWeek !== 1 || currentHour !== 9) {
    return { skipped: true, reason: 'Not weekly report time' };
  }

  const users = await User.find({ role: 'staff', isActive: true });

  let reportsSent = 0;

  const lastWeek = moment().subtract(1, 'week').startOf('week').toDate();

  for (const user of users) {
    const stats = await attendanceService.getAttendanceSummary({
      userId: user._id,
      startDate: lastWeek,
      endDate: moment(lastWeek).endOf('week').toDate()
    });

    await notificationQueue.add('weeklyReport', {
      type: 'weeklyReport',
      data:  { userId: user._id, stats }
    });

    reportsSent++;
  }

  return { reportsSent, totalUsers: users. length };
}

/**
 * Detect attendance anomalies
 */
async function detectAnomalies() {
  const users = await User.find({ role: 'staff', isActive: true });

  let anomaliesDetected = 0;

  for (const user of users) {
    const result = await analyticsService.detectAnomalies(user._id, 30);

    if (result.anomaliesDetected > 0) {
      anomaliesDetected += result.anomaliesDetected;

      // Notify managers about high-severity anomalies
      const highSeverity = result.anomalies.filter(a => a.severity === 'high');
      
      if (highSeverity. length > 0) {
        const managers = await User.find({ role: { $in: ['admin', 'manager'] } });
        // Send notifications to managers (implement as needed)
      }
    }
  }

  return { anomaliesDetected, totalUsers:  users.length };
}

logger.info('Attendance worker started');

module.exports = attendanceQueue;