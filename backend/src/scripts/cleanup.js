#!/usr/bin/env node

/**
 * Manual Database Cleanup Script
 * Runs all cleanup operations manually
 * Usage: node src/scripts/cleanup.js [operation]
 * Operations: locations, events, tokens, devices, all
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { Location, Event, User, Device } = require('../models');
const logger = require('../config/logger');
const moment = require('moment');

const operation = process.argv[2] || 'all';

async function cleanupOldLocations() {
  const retentionDays = parseInt(process.env.LOCATION_HISTORY_RETENTION_DAYS) || 90;
  const cutoffDate = moment().subtract(retentionDays, 'days').toDate();

  logger.info(`Deleting location records older than ${retentionDays} days (before ${cutoffDate})...`);

  const result = await Location.deleteMany({
    timestamp: { $lt: cutoffDate }
  });

  logger.info(`✅ Deleted ${result.deletedCount} location records`);
  return result.deletedCount;
}

async function cleanupOldEvents() {
  const retentionDays = parseInt(process. env. AUDIT_LOG_RETENTION_DAYS) || 365;
  const cutoffDate = moment().subtract(retentionDays, 'days').toDate();

  logger.info(`Deleting event logs older than ${retentionDays} days (before ${cutoffDate})...`);

  const result = await Event.deleteMany({
    createdAt: { $lt: cutoffDate },
    severity: { $nin: ['critical', 'error'] }
  });

  logger.info(`✅ Deleted ${result.deletedCount} event records`);
  return result.deletedCount;
}

async function cleanupExpiredTokens() {
  logger.info('Cleaning up expired refresh tokens...');

  const now = new Date();
  const result = await User.updateMany(
    { 'refreshTokens.expiresAt': { $lt: now } },
    { $pull: { refreshTokens: { expiresAt: { $lt:  now } } } }
  );

  logger.info(`✅ Cleaned up expired tokens from ${result.modifiedCount} users`);
  return result.modifiedCount;
}

async function cleanupInactiveDevices() {
  logger.info('Cleaning up inactive devices...');

  const inactiveDays = 90;
  const cutoffDate = moment().subtract(inactiveDays, 'days').toDate();

  const result = await Device.deleteMany({
    lastActive: { $lt: cutoffDate },
    isActive: false
  });

  logger.info(`✅ Deleted ${result.deletedCount} inactive devices`);
  return result.deletedCount;
}

async function runCleanup() {
  try {
    await mongoose.connect(process.env. MONGODB_URI);
    logger.info('Connected to MongoDB');

    let totalCleaned = 0;

    switch (operation) {
      case 'locations':
        totalCleaned = await cleanupOldLocations();
        break;
      
      case 'events':
        totalCleaned = await cleanupOldEvents();
        break;
      
      case 'tokens':
        totalCleaned = await cleanupExpiredTokens();
        break;
      
      case 'devices':
        totalCleaned = await cleanupInactiveDevices();
        break;
      
      case 'all':
        logger.info('Running full cleanup...\n');
        const locations = await cleanupOldLocations();
        const events = await cleanupOldEvents();
        const tokens = await cleanupExpiredTokens();
        const devices = await cleanupInactiveDevices();
        
        totalCleaned = locations + events + tokens + devices;
        
        logger.info('\n📊 Cleanup Summary:');
        logger.info(`  Locations: ${locations}`);
        logger.info(`  Events: ${events}`);
        logger.info(`  Tokens: ${tokens} users updated`);
        logger.info(`  Devices: ${devices}`);
        break;
      
      default: 
        logger.error(`Unknown operation: ${operation}`);
        logger.info('Available operations: locations, events, tokens, devices, all');
        process.exit(1);
    }

    logger.info(`\n✅ Cleanup completed!  Total items processed: ${totalCleaned}`);
    process.exit(0);
  } catch (error) {
    logger.error('Cleanup error:', error);
    process.exit(1);
  }
}

runCleanup();