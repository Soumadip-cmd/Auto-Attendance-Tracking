const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { locationLimiter } = require('../middleware/rateLimiter');

router.post('/', protect, locationLimiter, validate(schemas.submitLocation), locationController.submitLocation);
router.post('/batch', protect, locationLimiter, validate(schemas.submitLocations), locationController.submitLocations);
router.get('/history', protect, locationController.getLocationHistory);
router.get('/live', protect, authorize('admin', 'manager'), locationController.getLiveLocations);
router.get('/heatmap', protect, authorize('admin', 'manager'), locationController.getHeatmapData);
router.delete('/history', protect, locationController.deleteLocationHistory);

module.exports = router;
