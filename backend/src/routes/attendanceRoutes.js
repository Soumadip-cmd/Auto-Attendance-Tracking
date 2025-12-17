const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');

/**
 * @route   GET /api/v1/attendance
 * @desc    Get all attendance records
 * @access  Private/Admin
 */
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const attendance = await Attendance.find()
      .populate('user', 'firstName lastName email employeeId')
      .sort('-checkIn');
    
    res.status(200).json({
      success: true,
      count:  attendance.length,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance/: id
 * @desc    Get single attendance record
 * @access  Private
 */
// Get attendance by date
router.get('/', protect, async (req, res, next) => {
  try {
    const { date } = req.query;
    
    let query = {};
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query. checkIn = {
        $gte: startOfDay,
        $lte:  endOfDay,
      };
    }
    
    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeId email department')
      .sort('-checkIn');
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});
/**
 * @route   GET /api/v1/attendance/user/:userId
 * @desc    Get attendance records for a specific user
 * @access  Private
 */
router.get('/user/: userId', protect, async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ user: req.params.userId })
      .sort('-checkIn');
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance/dashboard
 * @desc    Get dashboard statistics
 * @access  Private/Admin
 */
router.get('/stats/dashboard', protect, authorize('admin'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalToday = await Attendance.countDocuments({
      checkIn: { $gte: today },
    });
    
    const presentToday = await Attendance.countDocuments({
      checkIn:  { $gte: today },
      status: 'present',
    });
    
    const lateToday = await Attendance. countDocuments({
      checkIn: { $gte: today },
      status: 'late',
    });

    res.status(200).json({
      success: true,
      data: {
        totalToday,
        presentToday,
        lateToday,
        absentToday: 0, // Calculate based on total employees
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;