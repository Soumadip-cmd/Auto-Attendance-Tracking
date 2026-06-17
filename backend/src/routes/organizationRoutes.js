const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { protect, authorize } = require('../middleware/auth');

router.get(
  '/colleges',
  protect,
  authorize('super_admin', 'admin', 'manager', 'hod'),
  organizationController.getColleges
);

router.post(
  '/colleges',
  protect,
  authorize('super_admin'),
  organizationController.createCollege
);

router.put(
  '/colleges/:id',
  protect,
  authorize('super_admin', 'admin', 'manager'),
  organizationController.updateCollege
);

router.get(
  '/departments',
  protect,
  authorize('super_admin', 'admin', 'manager', 'hod'),
  organizationController.getDepartments
);

router.post(
  '/departments',
  protect,
  authorize('super_admin', 'admin', 'manager'),
  organizationController.createDepartment
);

router.put(
  '/departments/:id',
  protect,
  authorize('super_admin', 'admin', 'manager'),
  organizationController.updateDepartment
);

router.get(
  '/departments/:id/teachers',
  protect,
  authorize('super_admin', 'admin', 'manager', 'hod'),
  organizationController.getTeachersInDepartment
);

router.post(
  '/departments/:id/teachers',
  protect,
  authorize('super_admin', 'admin', 'manager', 'hod'),
  organizationController.assignTeacherToDepartment
);

module.exports = router;
