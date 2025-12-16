const { notificationQueue } = require('../queues');
const notificationService = require('../../services/notificationService');
const logger = require('../../config/logger');

// Process notification jobs
notificationQueue.process(async (job) => {
  const { type, data } = job. data;

  logger.info(`Processing notification job: ${type}`, { jobId: job.id });

  try {
    let result;

    switch (type) {
      case 'checkInReminder':
        result = await notificationService.sendCheckInReminder(data.userId);
        break;

      case 'checkOutReminder':
        result = await notificationService.sendCheckOutReminder(data.userId);
        break;

      case 'lateArrival':
        result = await notificationService.sendLateArrivalNotification(data.userId, data.lateBy);
        break;

      case 'geofenceViolation':
        result = await notificationService.sendGeofenceViolationNotification(data.user, data.geofence);
        break;

      case 'weeklyReport':
        result = await notificationService.sendWeeklyReportNotification(data.userId, data.stats);
        break;

      case 'emergency':
        result = await notificationService.sendEmergencyAlert(data.title, data.message);
        break;

      case 'shiftReminder':
        result = await notificationService.sendShiftReminderNotification(data.userId, data.shiftDetails);
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    return { success: true, message: `${type} notification sent`, result };
  } catch (error) {
    logger.error(`Notification job failed:`, error);
    throw error;
  }
});

logger.info('Notification worker started');

module.exports = notificationQueue;