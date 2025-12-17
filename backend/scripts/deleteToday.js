require('dotenv').config();
const mongoose = require('mongoose');
const Attendance = require('../src/models/Attendance');

async function deleteTodayAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await Attendance.deleteMany({
      date: { $gte: today }
    });

    console.log(`✅ Deleted ${result.deletedCount} attendance records for today`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteTodayAttendance();
