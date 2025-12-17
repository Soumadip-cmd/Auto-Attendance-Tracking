const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');

/**
 * @route   GET /api/v1/attendance/today
 * @desc    Get today's attendance for current user
 * @access  Private
 */
router.get('/today', protect, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      user: req.user._id,
      checkIn: { $gte: today, $lt: tomorrow },
    });
    
    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance/history
 * @desc    Get attendance history for current user
 * @access  Private
 */
router.get('/history', protect, async (req, res, next) => {
  try {
    const { startDate, endDate, sortBy = 'date', sortOrder = 'desc' } = req.query;
    
    let query = { user: req.user._id };
    
    if (startDate || endDate) {
      query.checkIn = {};
      if (startDate) query.checkIn.$gte = new Date(startDate);
      if (endDate) query.checkIn.$lte = new Date(endDate);
    }
    
    const sortField = sortBy === 'date' ? 'checkIn' : sortBy;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    const attendance = await Attendance.find(query)
      .sort({ [sortField]: sortDirection })
      .limit(100);
    
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
 * @route   GET /api/v1/attendance/stats
 * @desc    Get attendance statistics for current user
 * @access  Private
 */
router.get('/stats', protect, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = new Date(today);
    if (period === 'week') {
      startDate.setDate(today.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(today.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(today.getMonth() - 3);
    }
    
    const attendanceRecords = await Attendance.find({
      user: req.user._id,
      checkIn: { $gte: startDate },
    });
    
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
    const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
    const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
    
    res.status(200).json({
      success: true,
      data: {
        period,
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        attendanceRate: totalDays > 0 ? ((presentDays + lateDays) / totalDays * 100).toFixed(1) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/attendance/check-in
 * @desc    Check in attendance
 * @access  Private
 */
router.post('/check-in', protect, async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, notes } = req.body;
    
    // Check if already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const existingAttendance = await Attendance.findOne({
      user: req.user._id,
      checkIn: { $gte: today, $lt: tomorrow },
    });
    
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Already checked in today',
      });
    }
    
    // Get current date (date only, no time)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // Create new attendance record
    const attendance = await Attendance.create({
      user: req.user._id,
      date: currentDate,
      checkIn: {
        time: new Date(),
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        method: 'manual',
      },
      status: 'present', // Will be updated based on time/geofence
      notes: notes || '',
    });
    
    res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/attendance/check-out
 * @desc    Check out attendance
 * @access  Private
 */
router.post('/check-out', protect, async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, notes } = req.body;
    
    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: today,
      'checkOut.time': null,
    });
    
    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in found for today',
      });
    }
    
    // Update attendance with check-out info
    attendance.checkOut = {
      time: new Date(),
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      method: 'manual',
    };
    
    if (notes) {
      attendance.notes = attendance.notes ? `${attendance.notes}; ${notes}` : notes;
    }
    
    await attendance.save();
    
    res.status(200).json({
      success: true,
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
router.get('/user/:userId', protect, async (req, res, next) => {
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
 * @route   GET /api/v1/attendance/stats/dashboard
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
      checkIn: { $gte: today },
      status: 'present',
    });
    
    const lateToday = await Attendance.countDocuments({
      checkIn: { $gte: today },
      status: 'late',
    });

    res.status(200).json({
      success: true,
      data: {
        totalToday,
        presentToday,
        lateToday,
        absentToday: 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance
 * @desc    Get all attendance records (with optional date filter)
 * @access  Private/Admin
 */
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { date } = req.query;
    
    let query = {};
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.checkIn = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }
    
    const attendance = await Attendance.find(query)
      .populate('user', 'firstName lastName employeeId email department')
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

module.exports = router;