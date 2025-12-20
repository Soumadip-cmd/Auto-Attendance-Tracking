#!/usr/bin/env node

require('dotenv').config();
const mongoose = require('mongoose');
const { User } = require('./src/models');

async function checkAndResetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find admin user
    const admin = await User.findOne({ email: 'admin@example.com' });
    
    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log('Creating new admin...\n');
      
      const newAdmin = await User.create({
        email: 'admin@example.com',
        password: 'Admin@123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        employeeId: 'ADMIN001',
        department: 'Administration',
        isActive: true,
        isVerified: true,
        consentGiven: true,
        trackingEnabled: false
      });
      
      console.log('✅ Admin user created!');
      console.log('Email: admin@example.com');
      console.log('Password: Admin@123\n');
    } else {
      console.log('✅ Admin user found!');
      console.log('Email:', admin.email);
      console.log('Role:', admin.role);
      console.log('Active:', admin.isActive);
      console.log('\nResetting password to: Admin@123\n');
      
      admin.password = 'Admin@123';
      await admin.save();
      
      console.log('✅ Password reset complete!\n');
      console.log('Login with:');
      console.log('  Email: admin@example.com');
      console.log('  Password: Admin@123\n');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkAndResetAdmin();
