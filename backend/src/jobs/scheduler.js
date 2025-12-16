const cron = require('node-cron');
const { 
  cleanupQueue, 
  attendanceQueue, 
  reportQueue,
  emailQueue 
} = require('./queues');
const logger = require('../config/logger');

/**
 * Setup all scheduled tasks
 */
function initializeScheduler() {
  logger.info('Initializing scheduled tasks...');

  // ==========================================
  // EVERY MINUTE (for testing/monitoring)
  // ==========================================
  
  // Health check
  cron.schedule('* * * * *', () => {
    logger.debug('Scheduler health check - running');
  });

  // ==========================================
  // EVERY 15 MINUTES
  // ==========================================
  
  // Check for users who need check-in reminders
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running check-in reminder check');
    await attendanceQueue.add('sendCheckInReminders', {
      type: 'sendCheckInReminders',
      data: {}
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  });

  // ==========================================
  // HOURLY
  // ==========================================
  
  // Check for check-out reminders (every hour from 5 PM to 7 PM)
  cron.schedule('0 17-19 * * *', async () => {
    logger.info('Running check-out reminder check');
    await attendanceQueue.add('sendCheckOutReminders', {
      type: 'sendCheckOutReminders',
      data: {}
    });
  });

  // ==========================================
  // DAILY TASKS
  // ==========================================

  // Mark absent users - runs at 11:59 PM daily
  cron.schedule('59 23 * * *', async () => {
    logger.info('Marking absent users for today');
    await attendanceQueue. add('markAbsent', {
      type: 'markAbsent',
      data: {}
    }, {
      attempts:  5,
      backoff: 'fixed'
    });
  });

  // Generate and send daily reports - runs at 7:00 PM daily
  cron.schedule('0 19 * * *', async () => {
    logger.info('Generating daily attendance reports');
    await attendanceQueue.add('generateDailyReports', {
      type: 'generateDailyReports',
      data: {}
    });
  });

  // Cleanup expired tokens - runs at 2:00 AM daily
  cron.schedule('0 2 * * *', async () => {
    logger.info('Cleaning up expired tokens');
    await cleanupQueue.add('expiredTokens', {
      type: 'expiredTokens'
    });
  });

  // Detect attendance anomalies - runs at 3:00 AM daily
  cron.schedule('0 3 * * *', async () => {
    logger.info('Detecting attendance anomalies');
    await attendanceQueue.add('detectAnomalies', {
      type:  'detectAnomalies',
      data: {}
    });
  });

  // ==========================================
  // WEEKLY TASKS
  // ==========================================

  // Generate weekly reports - runs every Monday at 9:00 AM
  cron.schedule('0 9 * * 1', async () => {
    logger.info('Generating weekly attendance reports');
    await attendanceQueue.add('generateWeeklyReports', {
      type: 'generateWeeklyReports',
      data: {}
    });
  });

  // Cleanup old location data - runs every Sunday at 1:00 AM
  cron.schedule('0 1 * * 0', async () => {
    logger.info('Cleaning up old location records');
    await cleanupQueue. add('oldLocations', {
      type: 'oldLocations'
    }, {
      attempts: 3
    });
  });

  // Cleanup inactive devices - runs every Sunday at 2:00 AM
  cron.schedule('0 2 * * 0', async () => {
    logger.info('Cleaning up inactive devices');
    await cleanupQueue.add('inactiveDevices', {
      type: 'inactiveDevices'
    });
  });

  // ==========================================
  // MONTHLY TASKS
  // ==========================================

  // Cleanup old event logs - runs on 1st of every month at 1:00 AM
  cron.schedule('0 1 1 * *', async () => {
    logger.info('Cleaning up old event logs');
    await cleanupQueue.add('oldEvents', {
      type: 'oldEvents'
    });
  });

  // Generate monthly reports - runs on 1st of every month at 10:00 AM
  cron.schedule('0 10 1 * *', async () => {
    logger.info('Generating monthly reports');
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const startDate = new Date(lastMonth. getFullYear(), lastMonth.getMonth(), 1);
    const endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

    await reportQueue.add('monthlyAttendance', {
      type: 'monthlyAttendance',
      filters: {
        startDate:  startDate.toISOString(),
        endDate: endDate. toISOString()
      }
    });
  });

  // Full database cleanup - runs on 1st of every month at 3:00 AM
  cron.schedule('0 3 1 * *', async () => {
    logger.info('Running comprehensive database cleanup');
    await cleanupQueue.add('all', {
      type: 'all'
    }, {
      attempts: 5,
      timeout: 300000 // 5 minutes timeout
    });
  });

  logger.info('✅ All scheduled tasks initialized successfully');
  logScheduleSummary();
}

/**
 * Log schedule summary
 */
function logScheduleSummary() {
  logger.info('📅 Scheduled Tasks Summary:');
  logger.info('  Every 15 min: Check-in reminder checks');
  logger.info('  Every hour (5-7 PM): Check-out reminders');
  logger.info('  Daily 11:59 PM: Mark absent users');
  logger.info('  Daily 7:00 PM: Generate daily reports');
  logger.info('  Daily 2:00 AM:  Cleanup expired tokens');
  logger.info('  Daily 3:00 AM:  Detect anomalies');
  logger.info('  Weekly (Mon 9 AM): Generate weekly reports');
  logger.info('  Weekly (Sun 1 AM): Cleanup old locations');
  logger.info('  Weekly (Sun 2 AM): Cleanup inactive devices');
  logger.info('  Monthly (1st, 1 AM): Cleanup old events');
  logger.info('  Monthly (1st, 10 AM): Generate monthly reports');
  logger.info('  Monthly (1st, 3 AM): Full database cleanup');
}

/**
 * Stop all scheduled tasks (for graceful shutdown)
 */
function stopScheduler() {
  logger.info('Stopping all scheduled tasks...');
  cron.getTasks().forEach(task => task.stop());
  logger.info('✅ All scheduled tasks stopped');
}

module.exports = {
  initializeScheduler,
  stopScheduler
};