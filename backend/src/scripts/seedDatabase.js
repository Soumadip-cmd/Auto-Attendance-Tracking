const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env. MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({ role: { $ne: 'admin' } });
    await Attendance.deleteMany({});
    console.log('🗑️  Cleared old data');

    // Create sample employees
    const employees = await User.insertMany([
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john. doe@company.com',
        password: '$2a$10$YourHashedPasswordHere', // You'll need to hash this
        employeeId: 'EMP001',
        role: 'staff',
        department: 'IT',
        phoneNumber: '+1234567890',
        isActive: true,
      },
      {
        firstName:  'Jane',
        lastName:  'Smith',
        email:  'jane.smith@company. com',
        password: '$2a$10$YourHashedPasswordHere',
        employeeId: 'EMP002',
        role: 'manager',
        department: 'HR',
        phoneNumber: '+1234567891',
        isActive: true,
      },
      {
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike.johnson@company.com',
        password: '$2a$10$YourHashedPasswordHere',
        employeeId: 'EMP003',
        role: 'staff',
        department: 'Sales',
        phoneNumber: '+1234567892',
        isActive: true,
      },
      {
        firstName: 'Sarah',
        lastName: 'Williams',
        email: 'sarah.williams@company.com',
        password: '$2a$10$YourHashedPasswordHere',
        employeeId: 'EMP004',
        role: 'staff',
        department: 'Marketing',
        phoneNumber: '+1234567893',
        isActive: true,
      },
      {
        firstName: 'David',
        lastName: 'Brown',
        email: 'david.brown@company.com',
        password: '$2a$10$YourHashedPasswordHere',
        employeeId: 'EMP005',
        role: 'staff',
        department: 'Finance',
        phoneNumber: '+1234567894',
        isActive: true,
      },
    ]);

    console.log(`✅ Created ${employees.length} employees`);

    // Create attendance records for the past week
    const attendanceRecords = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(9, 0, 0, 0);

      employees.forEach((emp, index) => {
        // Randomly assign attendance
        const isPresent = Math.random() > 0.2; // 80% attendance rate
        const isLate = isPresent && Math.random() > 0.7; // 30% late if present

        if (isPresent) {
          const checkIn = new Date(date);
          checkIn.setMinutes(isLate ? 15 : 0); // Late by 15 mins

          const checkOut = new Date(checkIn);
          checkOut.setHours(17, 0, 0, 0); // 5 PM checkout

          attendanceRecords.push({
            employee: emp._id,
            checkIn,
            checkOut,
            status: isLate ? 'late' : 'present',
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              address: 'Office Location',
            },
          });
        }
      });
    }

    await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${attendanceRecords.length} attendance records`);

    console.log('🎉 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();