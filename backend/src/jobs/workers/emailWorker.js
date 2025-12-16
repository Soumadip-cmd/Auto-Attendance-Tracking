const { emailQueue } = require('../queues');
const emailService = require('../../services/emailService');
const logger = require('../../config/logger');

// Process email jobs
emailQueue.process(async (job) => {
  const { type, data } = job. data;

  logger.info(`Processing email job: ${type}`, { jobId: job.id });

  try {
    switch (type) {
      case 'welcome':
        await emailService.sendWelcomeEmail(data. user);
        break;

      case 'passwordReset':
        await emailService.sendPasswordResetEmail(data.user, data.resetToken);
        break;

      case 'passwordChanged':
        await emailService. sendPasswordChangedEmail(data. user);
        break;

      case 'attendanceAlert':
        await emailService.sendAttendanceAlert(data.user, data.alertData);
        break;

      case 'geofenceViolation':
        await emailService.sendGeofenceViolationAlert(data.managers, data.user, data.violationData);
        break;

      case 'dailyReport':
        await emailService.sendDailyReport(data.manager, data.reportData);
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    return { success: true, message: `${type} email sent successfully` };
  } catch (error) {
    logger.error(`Email job failed: `, error);
    throw error;
  }
});

logger.info('Email worker started');

module.exports = emailQueue;
