#!/usr/bin/env node

/**
 * Bulk User Import Script
 * Import users from CSV file
 * Usage: node src/scripts/bulkImportUsers. js <csv-file-path>
 * 
 * CSV Format:
 * email,firstName,lastName,employeeId,department,phoneNumber,role
 * john@example.com,John,Doe,EMP001,Engineering,1234567890,staff
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('fast-csv');
const { User, Event } = require('../models');
const logger = require('../config/logger');

const csvFilePath = process.argv[2];

if (!csvFilePath) {
  logger.error('Please provide CSV file path');
  logger.info('Usage: node src/scripts/bulkImportUsers. js <csv-file-path>');
  process.exit(1);
}

if (!fs.existsSync(csvFilePath)) {
  logger.error(`File not found: ${csvFilePath}`);
  process.exit(1);
}

async function bulkImportUsers() {
  try {
    await mongoose.connect(process.env. MONGODB_URI);
    logger.info('Connected to MongoDB');

    const users = [];
    const errors = [];

    // Read CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv.parse({ headers: true, trim: true }))
        .on('data', (row) => {
          users.push(row);
        })
        .on('error', (error) => reject(error))
        .on('end', () => resolve());
    });

    logger.info(`Found ${users.length} users in CSV file`);
    logger.info('Starting import...\n');

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const userData of users) {
      try {
        // Validate required fields
        if (!userData.email || !userData.firstName || !userData.lastName) {
          errors.push({ user: userData, error: 'Missing required fields' });
          failed++;
          continue;
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
          logger.warn(`⚠️  User already exists: ${userData.email}`);
          skipped++;
          continue;
        }

        // Generate random password
        const password = `Temp@${Math.random().toString(36).slice(-8)}`;

        // Create user
        const user = await User. create({
          email: userData. email,
          password,
          firstName: userData.firstName,
          lastName: userData.lastName,
          employeeId: userData.employeeId || undefined,
          department: userData.department || undefined,
          phoneNumber:  userData.phoneNumber || undefined,
          role: userData.role || 'staff',
          isActive:  true,
          isVerified:  false,
          consentGiven:  false,
          trackingEnabled:  false
        });

        // Log event
        await Event.log({
          eventType: 'user. create',
          target: user._id,
          severity: 'info',
          details: {
            method: 'bulk_import',
            email: user.email
          }
        });

        logger.info(`✅ Imported:  ${user.email} (${user.employeeId || 'No EmpID'})`);
        logger.info(`   Temp password: ${password}`);
        
        imported++;
      } catch (error) {
        logger.error(`❌ Failed to import:  ${userData.email}`, error.message);
        errors.push({ user: userData, error: error.message });
        failed++;
      }
    }

    logger.info('\n📊 Import Summary:');
    logger.info(`  Total in CSV: ${users.length}`);
    logger.info(`  ✅ Successfully imported: ${imported}`);
    logger.info(`  ⚠️  Skipped (already exists): ${skipped}`);
    logger.info(`  ❌ Failed:  ${failed}`);

    if (errors.length > 0) {
      logger.info('\n❌ Errors: ');
      errors.forEach((err, index) => {
        logger.error(`  ${index + 1}. ${err.user.email}:  ${err.error}`);
      });
    }

    logger.info('\n⚠️  IMPORTANT: Send temporary passwords to users via email!');
    logger.info('Users must change passwords on first login.');

    process.exit(0);
  } catch (error) {
    logger.error('Bulk import error:', error);
    process.exit(1);
  }
}

bulkImportUsers();