const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.post('/checkin', protect, validate(schemas.checkIn), attendanceController.checkIn);
router.post('/checkout', protect, validate(schemas.checkOut), attendanceController.checkOut);
router.get('/records', protect, attendanceController.getRecords);
router.get('/summary', protect, attendanceController.getSummary);
router.get('/today', protect, attendanceController.getTodayStatus);
router.get('/overview', protect, authorize('admin', 'manager'), attendanceController.getOverview);

module.exports = router;
