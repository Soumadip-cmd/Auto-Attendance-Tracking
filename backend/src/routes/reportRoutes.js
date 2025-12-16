const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');

/**
 * @route   GET /api/v1/reports/daily
 * @desc    Get daily report
 * @access  Private/Admin
 */
router.get('/daily', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const attendance = await Attendance.find({
      checkIn: {
        $gte: targetDate,
        $lt: nextDay,
      },
    }).populate('user', 'firstName lastName email employeeId department');
    
    res.status(200).json({
      success: true,
      date: targetDate,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/reports/monthly
 * @desc    Get monthly report
 * @access  Private/Admin
 */
router. get('/monthly', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth();
    
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    
    const attendance = await Attendance.find({
      checkIn: {
        $gte: startDate,
        $lte: endDate,
      },
    }).populate('user', 'firstName lastName email employeeId department');
    
    res.status(200).json({
      success: true,
      period: {
        year: targetYear,
        month: targetMonth + 1,
      },
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;