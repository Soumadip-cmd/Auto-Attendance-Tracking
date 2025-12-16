const { cleanupQueue } = require('../queues');
const { Location, Event, User } = require('../../models');
const logger = require('../../config/logger');
const moment = require('moment');

// Process cleanup jobs
cleanupQueue.process(async (job) => {
  const { type } = job.data;

  logger.info(`Processing cleanup job: ${type}`, { jobId: job.id });

  try {
    let result;

    switch (type) {
      case 'oldLocations':
        result = await cleanupOldLocations();
        break;

      case 'oldEvents': 
        result = await cleanupOldEvents();
        break;

      case 'expiredTokens':
        result = await cleanupExpiredTokens();
        break;

      case 'inactiveDevices':
        result = await cleanupInactiveDevices();
        break;

      case 'all':
        const locations = await cleanupOldLocations();
        const events = await cleanupOldEvents();
        const tokens = await cleanupExpiredTokens();
        const devices = await cleanupInactiveDevices();
        result = { locations, events, tokens, devices };
        break;

      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }

    logger.info(`Cleanup completed: `, result);
    return { success: true, result };
  } catch (error) {
    logger.error(`Cleanup job failed:`, error);
    throw error;
  }
});

/**
 * Clean up old location records
 */
async function cleanupOldLocations() {
  const retentionDays = parseInt(process.env.LOCATION_HISTORY_RETENTION_DAYS) || 90;
  const cutoffDate = moment().subtract(retentionDays, 'days').toDate();

  const result = await Location.deleteMany({
    timestamp: { $lt: cutoffDate }
  });

  logger.info(`Deleted ${result.deletedCount} old location records`);
  return { deletedCount: result.deletedCount, cutoffDate };
}

/**
 * Clean up old event/audit logs
 */
async function cleanupOldEvents() {
  const retentionDays = parseInt(process.env. AUDIT_LOG_RETENTION_DAYS) || 365;
  const cutoffDate = moment().subtract(retentionDays, 'days').toDate();

  const result = await Event.deleteMany({
    createdAt: { $lt: cutoffDate },
    severity: { $nin: ['critical', 'error'] } // Keep critical events
  });

  logger.info(`Deleted ${result.deletedCount} old event records`);
  return { deletedCount: result.deletedCount, cutoffDate };
}

/**
 * Clean up expired refresh tokens
 */
async function cleanupExpiredTokens() {
  const now = new Date();
  
  const result = await User.updateMany(
    { 'refreshTokens.expiresAt': { $lt:  now } },
    { $pull: { refreshTokens: { expiresAt: { $lt:  now } } } }
  );

  logger.info(`Cleaned up expired tokens from ${result.modifiedCount} users`);
  return { modifiedCount: result.modifiedCount };
}

/**
 * Clean up inactive devices
 */
async function cleanupInactiveDevices() {
  const { Device } = require('../../models');
  const inactiveDays = 90;
  const cutoffDate = moment().subtract(inactiveDays, 'days').toDate();

  const result = await Device.deleteMany({
    lastActive: { $lt: cutoffDate },
    isActive: false
  });

  logger.info(`Deleted ${result.deletedCount} inactive devices`);
  return { deletedCount: result.deletedCount, cutoffDate };
}

logger.info('Cleanup worker started');

module.exports = cleanupQueue;