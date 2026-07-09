const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const notificationService = require('../services/notificationService');

/**
 * @route   POST /api/v1/notifications/register-device
 * @desc    Register/update this device's push token for the current user
 * @access  Private
 */
router.post('/register-device', protect, async (req, res, next) => {
  try {
    const { deviceId, token, deviceType } = req.body;
    if (!deviceId || !token) {
      return res.status(400).json({
        success: false,
        message: 'deviceId and token are required',
      });
    }

    const result = await notificationService.registerDeviceToken(req.user._id, deviceId, token, deviceType);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/notifications/unregister-device
 * @desc    Clear this device's push token for the current user
 * @access  Private
 */
router.post('/unregister-device', protect, async (req, res, next) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'deviceId is required',
      });
    }

    const result = await notificationService.unregisterDeviceToken(req.user._id, deviceId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
