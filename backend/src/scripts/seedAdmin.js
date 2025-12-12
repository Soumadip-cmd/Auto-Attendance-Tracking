require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('../models');
const logger = require('../config/logger');

/**
 * Script to seed admin user
 */
const seedAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Check if admin already exists
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      logger.info('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'Admin@12345',
      firstName: process.env.ADMIN_FIRST_NAME || 'System',
      lastName: process.env.ADMIN_LAST_NAME || 'Administrator',
      role: 'admin',
      isActive: true,
      isVerified: true,
      consentGiven: true
    });

    logger.info(`Admin user created successfully: ${admin.email}`);
    logger.info('Please change the default password after first login');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding admin user:', error);
    process.exit(1);
  }
};

seedAdmin();
