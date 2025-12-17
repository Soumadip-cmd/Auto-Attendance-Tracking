const express = require('express');
const router = express.Router();

// Import route files
const authRoutes = require('./authRoutes');
const locationRoutes = require('./locationRoutes');
const attendanceRoutes = require('./attendanceRoutes');
const geofenceRoutes = require('./geofenceRoutes');
const settingsRoutes = require('./settingsRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/locations', locationRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/geofences', geofenceRoutes);
router.use('/settings', settingsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
