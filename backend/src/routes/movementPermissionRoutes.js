const express = require('express');
const router = express.Router();
const movementPermissionController = require('../controllers/movementPermissionController');
const { protect, authorize } = require('../middleware/auth');

router.post(
  '/',
  protect,
  authorize('teacher', 'staff', 'hod', 'admin', 'manager', 'super_admin'),
  movementPermissionController.createRequest
);

router.get(
  '/',
  protect,
  authorize('teacher', 'staff', 'hod', 'admin', 'manager', 'super_admin'),
  movementPermissionController.getRequests
);

router.get(
  '/:id',
  protect,
  authorize('teacher', 'staff', 'hod', 'admin', 'manager', 'super_admin'),
  movementPermissionController.getRequestById
);

router.put(
  '/:id/approve',
  protect,
  authorize('hod', 'admin', 'manager', 'super_admin'),
  movementPermissionController.approveRequest
);

router.put(
  '/:id/reject',
  protect,
  authorize('hod', 'admin', 'manager', 'super_admin'),
  movementPermissionController.rejectRequest
);

router.put(
  '/:id/cancel',
  protect,
  authorize('teacher', 'staff', 'hod', 'admin', 'manager', 'super_admin'),
  movementPermissionController.cancelRequest
);

module.exports = router;
