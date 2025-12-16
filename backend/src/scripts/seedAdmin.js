#!/usr/bin/env node

/**
 * Seed Admin User Script
 * Creates a default admin user for initial system setup
 * Usage: node src/scripts/seedAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models');
const logger = require('../config/logger');

async function seedAdmin() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      logger.warn('Admin user already exists! ');
      logger.info(`Email: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Create admin user
    const adminData = {
      email: process. env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env. ADMIN_PASSWORD || 'Admin@123456',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      employeeId: 'ADMIN001',
      department: 'Administration',
      phoneNumber: '+1234567890',
      isActive: true,
      isVerified: true,
      consentGiven: true,
      trackingEnabled: false // Admin doesn't need tracking
    };

    const admin = await User.create(adminData);

    logger.info('✅ Admin user created successfully! ');
    logger.info('================================');
    logger.info(`Email: ${admin.email}`);
    logger.info(`Password: ${adminData.password}`);
    logger.info(`Role: ${admin.role}`);
    logger.info('================================');
    logger.info('⚠️  Please change the password after first login! ');

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding admin user:', error);
    process.exit(1);
  }
}

seedAdmin();