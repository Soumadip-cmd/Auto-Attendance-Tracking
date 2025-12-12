const express = require('express');
const router = express.Router();
const geofenceController = require('../controllers/geofenceController');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.post('/', protect, authorize('admin'), validate(schemas.createGeofence), geofenceController.createGeofence);
router.get('/', protect, geofenceController.getGeofences);
router.get('/:id', protect, geofenceController.getGeofence);
router.put('/:id', protect, authorize('admin'), validate(schemas.updateGeofence), geofenceController.updateGeofence);
router.delete('/:id', protect, authorize('admin'), geofenceController.deleteGeofence);
router.post('/check', protect, geofenceController.checkLocation);

module.exports = router;
