#!/usr/bin/env node

/**
 * Background Job Worker
 * This file starts all queue workers and processes background jobs
 * Run this separately from the main server:  node src/jobs/worker.js
 */

require('dotenv').config();
const logger = require('../config/logger');
const connectDB = require('../config/database');

// Import all workers
require('./workers/emailWorker');
require('./workers/reportWorker');
require('./workers/cleanupWorker');
require('./workers/notificationWorker');
require('./workers/attendanceWorker');

const { initializeScheduler, stopScheduler } = require('./scheduler');

// Connect to database
connectDB();

// Initialize scheduler
initializeScheduler();

logger.info('🚀 Background job worker started successfully');
logger.info('📋 Active workers:  Email, Report, Cleanup, Notification, Attendance');
logger.info('⏰ Scheduler initialized with all cron jobs');

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown() {
  logger.info('⚠️  Received shutdown signal, closing worker gracefully...');
  
  stopScheduler();
  
  // Close queue connections
  const { 
    emailQueue, 
    reportQueue, 
    cleanupQueue, 
    notificationQueue, 
    attendanceQueue 
  } = require('./queues');

  await Promise.all([
    emailQueue.close(),
    reportQueue.close(),
    cleanupQueue.close(),
    notificationQueue.close(),
    attendanceQueue.close()
  ]);

  logger.info('✅ Worker shut down gracefully');
  process.exit(0);
}