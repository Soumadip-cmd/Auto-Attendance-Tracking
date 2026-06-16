#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models');
const logger = require('../config/logger');

async function seedSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    const email = process.env.SUPER_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'superadmin@example.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'SuperAdmin@123456';

    const existingSuperAdmin = await User.findOne({
      $or: [{ role: 'super_admin' }, { email }]
    });

    if (existingSuperAdmin) {
      logger.warn('Super admin already exists');
      logger.info(`Email: ${existingSuperAdmin.email}`);
      process.exit(0);
    }

    const superAdmin = await User.create({
      email,
      password,
      firstName: process.env.SUPER_ADMIN_FIRST_NAME || 'College',
      lastName: process.env.SUPER_ADMIN_LAST_NAME || 'Super Admin',
      role: 'super_admin',
      employeeId: process.env.SUPER_ADMIN_EMPLOYEE_ID || 'SUPERADMIN001',
      department: 'Administration',
      phoneNumber: process.env.SUPER_ADMIN_PHONE || '',
      isActive: true,
      isVerified: true,
      consentGiven: true,
      trackingEnabled: false,
      permissions: {
        canLiveTrack: false,
        canRequestMovementPermission: false,
        canApproveMovementPermission: true
      }
    });

    logger.info('Super admin created successfully');
    logger.info('================================');
    logger.info(`Email: ${superAdmin.email}`);
    logger.info(`Password: ${password}`);
    logger.info(`Role: ${superAdmin.role}`);
    logger.info('================================');
    logger.info('Please change this password after first login.');

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding super admin user:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
