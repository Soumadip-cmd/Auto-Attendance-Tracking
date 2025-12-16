const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getWeeklyAttendance,
  getDepartmentDistribution,
  getMonthlyTrend,
  getRecentActivity
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth'); // ✅ CHANGE THIS LINE

// Rest of the file...

// All dashboard routes require authentication
router.use(protect);

// @route   GET /api/dashboard/stats
// @desc    Get overall dashboard statistics
// @access  Private
router.get('/stats', getDashboardStats);

// @route   GET /api/dashboard/weekly-attendance
// @desc    Get weekly attendance data for chart
// @access  Private
router.get('/weekly-attendance', getWeeklyAttendance);

// @route   GET /api/dashboard/department-distribution
// @desc    Get department distribution for pie chart
// @access  Private
router.get('/department-distribution', getDepartmentDistribution);

// @route   GET /api/dashboard/monthly-trend
// @desc    Get 6-month attendance trend
// @access  Private
router.get('/monthly-trend', getMonthlyTrend);

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent check-in/check-out activity
// @access  Private
router.get('/recent-activity', getRecentActivity);

module.exports = router;