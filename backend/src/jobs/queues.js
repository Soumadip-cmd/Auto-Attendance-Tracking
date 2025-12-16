const Bull = require('bull');
const logger = require('../config/logger');

// Initialize Redis connection for Bull
const redisConfig = {
  redis: {
    host: process. env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password:  process.env.REDIS_PASSWORD || undefined
  }
};

// Create queues
const emailQueue = new Bull('email', redisConfig);
const reportQueue = new Bull('report', redisConfig);
const cleanupQueue = new Bull('cleanup', redisConfig);
const notificationQueue = new Bull('notification', redisConfig);
const attendanceQueue = new Bull('attendance', redisConfig);

// Queue event listeners
const setupQueueListeners = (queue, name) => {
  queue.on('completed', (job, result) => {
    logger.info(`${name} job ${job.id} completed:`, result);
  });

  queue.on('failed', (job, err) => {
    logger.error(`${name} job ${job.id} failed:`, err);
  });

  queue.on('stalled', (job) => {
    logger.warn(`${name} job ${job.id} stalled`);
  });
};

// Setup listeners for all queues
setupQueueListeners(emailQueue, 'Email');
setupQueueListeners(reportQueue, 'Report');
setupQueueListeners(cleanupQueue, 'Cleanup');
setupQueueListeners(notificationQueue, 'Notification');
setupQueueListeners(attendanceQueue, 'Attendance');

// Export queues
module.exports = {
  emailQueue,
  reportQueue,
  cleanupQueue,
  notificationQueue,
  attendanceQueue
};