const { Location, Device, Geofence, Event, User } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const crypto = require('crypto');

/**
 * @desc    Submit location data
 * @route   POST /api/v1/locations
 * @access  Private
 */
exports.submitLocation = asyncHandler(async (req, res) => {
  const {
    latitude,
    longitude,
    accuracy,
    altitude,
    altitudeAccuracy,
    heading,
    speed,
    timestamp,
    trackingType,
    batteryLevel,
    networkType,
    activity,
    signature,
    deviceId,
    violation,
    violationType,
    geofenceId,
    geofenceName,
    severity,
    notes
  } = req.body;

  // Check if user has given consent and tracking is enabled
  if (!req.user.consentGiven || !req.user.trackingEnabled) {
    return res.status(403).json({
      success: false,
      message: 'Location tracking not enabled or consent not given'
    });
  }

  // Find or create device
  let device = await Device.findOne({ user: req.user._id, deviceId });
  if (!device) {
    device = await Device.create({
      user: req.user._id,
      deviceId,
      deviceType: req.body.deviceType || 'android',
      isActive: true
    });
  }

  // Verify location signature
  const expectedSignature = Location.generateSignature(
    req.user._id,
    longitude,
    latitude,
    new Date(timestamp).getTime()
  );

  if (signature !== expectedSignature) {
    logger.warn(`Tampered location data from user ${req.user._id}`);
    
    await Event.log({
      eventType: 'location.tamper-detected',
      actor: req.user._id,
      severity: 'critical',
      details: {
        latitude,
        longitude,
        timestamp,
        expectedSignature,
        receivedSignature: signature
      },
      device: device._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(400).json({
      success: false,
      message: 'Location data integrity check failed'
    });
  }

  // Find geofences containing this location
  const geofences = await Geofence.findContainingPoint(longitude, latitude);
  const geofenceData = geofences.map(gf => ({
    geofence: gf._id,
    status: 'inside'
  }));

  // Create location record
  const location = await Location.create({
    user: req.user._id,
    device: device._id,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    accuracy,
    altitude,
    altitudeAccuracy,
    heading,
    speed,
    timestamp: new Date(timestamp),
    trackingType,
    batteryLevel,
    networkType,
    activity,
    signature,
    geofences: geofenceData
  });

  // Emit real-time update via WebSocket (handled by socket service)
  if (req.app.io) {
    req.app.io.to('admin-room').emit('location:update', {
      userId: req.user._id,
      userName: req.user.fullName,
      location: {
        latitude,
        longitude,
        accuracy,
        timestamp
      },
      geofences: geofences.map(gf => gf.name)
    });
  }

  // Handle violation if flagged
  if (violation) {
    await Event.log({
      eventType: `geofence.${violationType || 'violation'}`,
      actor: req.user._id,
      resource: { type: 'geofence', id: geofenceId },
      severity: severity || 'warning',
      details: {
        geofenceName,
        violationType,
        notes,
        location: { latitude, longitude },
        timestamp
      },
      device: device._id
    });

    // Mark attendance with anomaly
    const Attendance = require('../models/Attendance');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Attendance.findOneAndUpdate(
      { user: req.user._id, date: today },
      {
        $push: {
          anomalies: {
            type: violationType || 'early_departure',
            description: notes || `Left ${geofenceName} during working hours`,
            detectedAt: new Date(),
            location: { latitude, longitude },
            severity: severity || 'high'
          }
        }
      },
      { new: true }
    );

    // Notify managers
    const notificationService = require('../services/notificationService');
    const managers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true });
    
    if (managers.length > 0) {
      await notificationService.sendGeofenceViolationNotification(
        req.user,
        { name: geofenceName, _id: geofenceId }
      );
    }
  }

  // Log location update
  await Event.log({
    eventType: violation ? 'location.violation' : 'location.update',
    actor: req.user._id,
    resource: { type: 'location', id: location._id },
    severity: violation ? (severity || 'warning') : 'info',
    details: {
      trackingType,
      geofencesInside: geofences.length,
      batteryLevel,
      violation,
      violationType
    },
    device: device._id
  });

  res.status(201).json({
    success: true,
    data: {
      locationId: location._id,
      geofences: geofences.map(gf => ({
        id: gf._id,
        name: gf.name,
        type: gf.type
      }))
    }
  });
});

/**
 * @desc    Submit batch location data (for offline sync)
 * @route   POST /api/v1/locations/batch
 * @access  Private
 */
exports.submitLocations = asyncHandler(async (req, res) => {
  const { locations, deviceId } = req.body;

  if (!req.user.consentGiven || !req.user.trackingEnabled) {
    return res.status(403).json({
      success: false,
      message: 'Location tracking not enabled or consent not given'
    });
  }

  // Find device
  let device = await Device.findOne({ user: req.user._id, deviceId });
  if (!device) {
    device = await Device.create({
      user: req.user._id,
      deviceId,
      deviceType: 'android',
      isActive: true
    });
  }

  const results = [];
  const errors = [];

  for (const loc of locations) {
    try {
      // Verify signature
      const expectedSignature = Location.generateSignature(
        req.user._id,
        loc.longitude,
        loc.latitude,
        new Date(loc.timestamp).getTime()
      );

      if (loc.signature !== expectedSignature) {
        errors.push({
          timestamp: loc.timestamp,
          error: 'Invalid signature'
        });
        continue;
      }

      // Find geofences
      const geofences = await Geofence.findContainingPoint(loc.longitude, loc.latitude);
      const geofenceData = geofences.map(gf => ({
        geofence: gf._id,
        status: 'inside'
      }));

      // Create location
      const location = await Location.create({
        user: req.user._id,
        device: device._id,
        location: {
          type: 'Point',
          coordinates: [loc.longitude, loc.latitude]
        },
        accuracy: loc.accuracy,
        altitude: loc.altitude,
        altitudeAccuracy: loc.altitudeAccuracy,
        heading: loc.heading,
        speed: loc.speed,
        timestamp: new Date(loc.timestamp),
        trackingType: loc.trackingType || 'background',
        batteryLevel: loc.batteryLevel,
        networkType: loc.networkType,
        activity: loc.activity,
        signature: loc.signature,
        geofences: geofenceData
      });

      results.push({ timestamp: loc.timestamp, locationId: location._id });
    } catch (error) {
      logger.error('Error processing batch location:', error);
      errors.push({
        timestamp: loc.timestamp,
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    data: {
      processed: results.length,
      errors: errors.length,
      results,
      errors
    }
  });
});

/**
 * @desc    Get location history
 * @route   GET /api/v1/locations/history
 * @access  Private
 */
exports.getLocationHistory = asyncHandler(async (req, res) => {
  console.log('📍 GET /locations/history called with params:', req.query);
  
  const {
    userId,
    startDate,
    endDate,
    limit = 100,
    page = 1,
    trackingType
  } = req.query;

  // Determine whose history to retrieve
  let targetUserId = req.user._id;
  if (userId && (req.user.role === 'admin' || req.user.role === 'manager')) {
    targetUserId = userId;
  } else if (userId && userId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view other users\' location history'
    });
  }

  // Build query
  const query = { user: targetUserId };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  if (trackingType) {
    query.trackingType = trackingType;
  }

  console.log('🔍 Querying locations with:', query);

  // Execute query with pagination
  const skip = (page - 1) * limit;
  const locations = await Location.find(query)
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .populate('geofences.geofence', 'name type')
    .select('-signature');

  const total = await Location.countDocuments(query);

  console.log(`✅ Found ${locations.length} location records (total: ${total})`);

  res.json({
    success: true,
    data: {
      locations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Get live locations (admin/manager only)
 * @route   GET /api/v1/locations/live
 * @access  Private (Admin/Manager)
 */
exports.getLiveLocations = asyncHandler(async (req, res) => {
  // Get latest location for each active user
  const timeThreshold = new Date(Date.now() - 15 * 60 * 1000); // Last 15 minutes

  const locations = await Location.aggregate([
    {
      $match: {
        timestamp: { $gte: timeThreshold }
      }
    },
    {
      $sort: { timestamp: -1 }
    },
    {
      $group: {
        _id: '$user',
        latestLocation: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestLocation' }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'userInfo'
      }
    },
    {
      $unwind: '$userInfo'
    },
    {
      $match: {
        'userInfo.isActive': true,
        'userInfo.trackingEnabled': true
      }
    },
    {
      $project: {
        user: '$userInfo._id',
        userName: { $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName'] },
        email: '$userInfo.email',
        department: '$userInfo.department',
        location: 1,
        accuracy: 1,
        timestamp: 1,
        trackingType: 1,
        batteryLevel: 1,
        activity: 1
      }
    }
  ]);

  res.json({
    success: true,
    data: {
      locations,
      count: locations.length
    }
  });
});

/**
 * @desc    Get location heatmap data
 * @route   GET /api/v1/locations/heatmap
 * @access  Private (Admin/Manager)
 */
exports.getHeatmapData = asyncHandler(async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  const query = {};

  if (userId) {
    query.user = userId;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  // Get locations grouped by coordinates
  const heatmapData = await Location.aggregate([
    { $match: query },
    {
      $group: {
        _id: {
          lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 4] },
          lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 4] }
        },
        count: { $sum: 1 },
        avgAccuracy: { $avg: '$accuracy' }
      }
    },
    {
      $project: {
        _id: 0,
        latitude: '$_id.lat',
        longitude: '$_id.lng',
        intensity: '$count',
        avgAccuracy: 1
      }
    },
    { $limit: 1000 } // Limit for performance
  ]);

  res.json({
    success: true,
    data: {
      points: heatmapData
    }
  });
});

/**
 * @desc    Delete location history (GDPR compliance)
 * @route   DELETE /api/v1/locations/history
 * @access  Private
 */
exports.deleteLocationHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.body;

  const query = { user: req.user._id };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const result = await Location.deleteMany(query);

  // Log data deletion
  await Event.log({
    eventType: 'privacy.data-deletion',
    actor: req.user._id,
    severity: 'warning',
    details: {
      deletedCount: result.deletedCount,
      startDate,
      endDate
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: `Deleted ${result.deletedCount} location records`
  });
});
