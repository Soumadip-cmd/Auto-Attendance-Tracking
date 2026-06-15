const express = require('express');
const router = express.Router();
const liveTrackingController = require('../controllers/liveTrackingController');
const { protect, authorize } = require('../middleware/auth');

router.post(
  '/location',
  protect,
  authorize('teacher', 'staff', 'hod', 'admin', 'manager', 'super_admin'),
  liveTrackingController.submitLocation
);

router.post('/stop', protect, liveTrackingController.stopTracking);

router.get(
  '/live',
  protect,
  authorize('super_admin', 'admin', 'manager', 'hod'),
  liveTrackingController.getLiveLocations
);

router.get(
  '/teacher/:teacherId/trail',
  protect,
  authorize('super_admin', 'admin', 'manager', 'hod', 'teacher', 'staff'),
  liveTrackingController.getTeacherTrail
);

router.get(
  '/teacher/:teacherId',
  protect,
  authorize('super_admin', 'admin', 'manager', 'hod', 'teacher', 'staff'),
  liveTrackingController.getTeacherLiveLocation
);

module.exports = router;
