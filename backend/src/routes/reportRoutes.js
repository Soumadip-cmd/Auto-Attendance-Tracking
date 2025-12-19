const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  generateReport,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  exportReportData
} = require('../controllers/reportController');

// All report routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin', 'manager'));

/**
 * @route   POST /api/v1/reports/generate
 * @desc    Generate custom report by type and date range
 * @access  Private/Admin/Manager
 */
router.post('/generate', generateReport);

/**
 * @route   GET /api/v1/reports/daily/: date
 * @desc    Get daily attendance report
 * @access  Private/Admin/Manager
 * @example /api/v1/reports/daily/2025-12-17
 */
router.get('/daily/:date', getDailyReport);

/**
 * @route   GET /api/v1/reports/weekly/: startDate/:endDate
 * @desc    Get weekly attendance report
 * @access  Private/Admin/Manager
 * @example /api/v1/reports/weekly/2025-12-10/2025-12-16
 */
router.get('/weekly/:startDate/:endDate', getWeeklyReport);

/**
 * @route   GET /api/v1/reports/monthly/:month/:year
 * @desc    Get monthly attendance report
 * @access  Private/Admin/Manager
 * @example /api/v1/reports/monthly/12/2025
 */
router.get('/monthly/:month/:year', getMonthlyReport);

/**
 * @route   GET /api/v1/reports/export
 * @desc    Export report data for Excel/CSV
 * @access  Private/Admin/Manager
 * @query   startDate, endDate, format
 * @example /api/v1/reports/export?startDate=2025-12-01&endDate=2025-12-17&format=json
 */
router.get('/export', exportReportData);

/**
 * @route   POST /api/v1/reports/custom
 * @desc    Generate custom report with filters
 * @access  Private/Admin/Manager
 */
router.post('/custom', async (req, res, next) => {
  try {
    const { startDate, endDate, employee, department } = req.body;
    
    console.log('📊 Custom report request:', { startDate, endDate, employee, department });
    
    // Use generate report with these filters
    req.body.type = 'custom';
    return generateReport(req, res, next);
  } catch (error) {
    next(error);
  }
});

// ============================================
// LEGACY ROUTES (Keep for backward compatibility)
// ============================================

/**
 * @route   GET /api/v1/reports/daily
 * @desc    Get daily report (legacy - query param version)
 * @access  Private/Admin/Manager
 */
router.get('/daily', async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Redirect to new endpoint
    return getDailyReport({ params: { date: targetDate } }, res);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/reports/monthly
 * @desc    Get monthly report (legacy - query param version)
 * @access  Private/Admin/Manager
 */
router.get('/monthly', async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;
    
    // Redirect to new endpoint
    return getMonthlyReport({ 
      params: { 
        month: targetMonth, 
        year: targetYear 
      } 
    }, res);
  } catch (error) {
    next(error);
  }
});

module.exports = router;