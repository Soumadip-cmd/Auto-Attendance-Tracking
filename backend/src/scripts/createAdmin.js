const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env. MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    const existingAdmin = await User.findOne({ email: 'admin@yourcompany.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@yourcompany.com',
      password: 'Admin@123456',
      employeeId: 'ADMIN001',
      role: 'admin',
      department: 'IT',
      phoneNumber: '+1234567890',
      isActive: true,
    });

    console.log('✅ Admin user created successfully! ');
    console.log('📧 Email: admin@yourcompany.com');
    console.log('🔑 Password: Admin@123456');
    console.log('⚠️  Please change the password after first login! ');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();