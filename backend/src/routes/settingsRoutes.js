const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// In-memory storage for settings (in production, use database)
let workScheduleSettings = {
  workDays: {
    monday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
    tuesday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
    wednesday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
    thursday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
    friday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
    saturday: { enabled: false, startTime: '09:00', endTime: '14:00', breakDuration: 0 },
    sunday: { enabled: false, startTime: '09:00', endTime: '14:00', breakDuration: 0 },
  },
  lateGracePeriod: 15,
  earlyCheckoutGracePeriod: 15,
  minimumWorkHours: 8,
  overtimeThreshold: 9,
  halfDayThreshold: 4,
  autoCheckout: false,
  autoCheckoutTime: '18:30',
};

/**
 * @route   GET /api/v1/settings/work-schedule
 * @desc    Get work schedule settings
 * @access  Private/Admin
 */
router.get('/work-schedule', protect, authorize('admin'), async (req, res) => {
  res.status(200).json({
    success: true,
    data: workScheduleSettings,
  });
});

/**
 * @route   POST /api/v1/settings/work-schedule
 * @desc    Update work schedule settings
 * @access  Private/Admin
 */
router.post('/work-schedule', protect, authorize('admin'), async (req, res) => {
  try {
    workScheduleSettings = {
      ...workScheduleSettings,
      ...req.body,
    };

    res.status(200).json({
      success: true,
      message: 'Work schedule settings updated successfully',
      data: workScheduleSettings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
