const { Geofence, Event } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * @desc    Create new geofence
 * @route   POST /api/v1/geofences
 * @access  Private/Admin
 */
exports.createGeofence = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    latitude,
    longitude,
    radius,
    type,
    address,
    workingHours,
    color
  } = req.body;

  // Create geofence
  const geofence = await Geofence.create({
    name,
    description,
    center: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    radius,
    type,
    address,
    workingHours,
    color,
    createdBy: req.user._id
  });

  // Log event
  await Event.log({
    eventType: 'geofence.created',
    actor: req.user._id,
    resource: { type: 'geofence', id: geofence._id },
    severity: 'info',
    details: {
      name: geofence.name,
      type: geofence.type,
      radius: geofence.radius
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  logger.info(`Geofence created: ${geofence.name} by ${req.user.fullName}`);

  res.status(201).json({
    success: true,
    data: geofence
  });
});

/**
 * @desc    Get all geofences
 * @route   GET /api/v1/geofences
 * @access  Private
 */
exports.getGeofences = asyncHandler(async (req, res) => {
  const { isActive, type } = req.query;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  if (type) {
    filter.type = type;
  }

  const geofences = await Geofence.find(filter)
    .populate('createdBy', 'fullName email')
    .populate('updatedBy', 'fullName email')
    .sort('-createdAt');

  res.json({
    success: true,
    count: geofences.length,
    data: geofences
  });
});

/**
 * @desc    Get single geofence
 * @route   GET /api/v1/geofences/:id
 * @access  Private
 */
exports.getGeofence = asyncHandler(async (req, res) => {
  const geofence = await Geofence.findById(req.params.id)
    .populate('createdBy', 'fullName email')
    .populate('updatedBy', 'fullName email');

  if (!geofence) {
    return res.status(404).json({
      success: false,
      message: 'Geofence not found'
    });
  }

  res.json({
    success: true,
    data: geofence
  });
});

/**
 * @desc    Update geofence
 * @route   PUT /api/v1/geofences/:id
 * @access  Private/Admin
 */
exports.updateGeofence = asyncHandler(async (req, res) => {
  let geofence = await Geofence.findById(req.params.id);

  if (!geofence) {
    return res.status(404).json({
      success: false,
      message: 'Geofence not found'
    });
  }

  const {
    name,
    description,
    latitude,
    longitude,
    radius,
    type,
    address,
    workingHours,
    color,
    isActive
  } = req.body;

  // Update fields
  if (name !== undefined) geofence.name = name;
  if (description !== undefined) geofence.description = description;
  if (latitude !== undefined && longitude !== undefined) {
    geofence.center = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
  }
  if (radius !== undefined) geofence.radius = radius;
  if (type !== undefined) geofence.type = type;
  if (address !== undefined) geofence.address = address;
  if (workingHours !== undefined) geofence.workingHours = workingHours;
  if (color !== undefined) geofence.color = color;
  if (isActive !== undefined) geofence.isActive = isActive;
  geofence.updatedBy = req.user._id;

  await geofence.save();

  // Log event
  await Event.log({
    eventType: 'geofence.updated',
    actor: req.user._id,
    resource: { type: 'geofence', id: geofence._id },
    severity: 'info',
    details: {
      name: geofence.name,
      changes: req.body
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  logger.info(`Geofence updated: ${geofence.name} by ${req.user.fullName}`);

  res.json({
    success: true,
    data: geofence
  });
});

/**
 * @desc    Delete geofence
 * @route   DELETE /api/v1/geofences/:id
 * @access  Private/Admin
 */
exports.deleteGeofence = asyncHandler(async (req, res) => {
  const geofence = await Geofence.findById(req.params.id);

  if (!geofence) {
    return res.status(404).json({
      success: false,
      message: 'Geofence not found'
    });
  }

  await geofence.deleteOne();

  // Log event
  await Event.log({
    eventType: 'geofence.deleted',
    actor: req.user._id,
    resource: { type: 'geofence', id: geofence._id },
    severity: 'warning',
    details: {
      name: geofence.name
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  logger.info(`Geofence deleted: ${geofence.name} by ${req.user.fullName}`);

  res.json({
    success: true,
    data: {}
  });
});

/**
 * @desc    Check if location is within any geofence
 * @route   POST /api/v1/geofences/check
 * @access  Private
 */
exports.checkLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }

  // Find all geofences containing this point
  const containing = await Geofence.findContainingPoint(longitude, latitude);

  // Find nearest geofence
  const nearest = await Geofence.findNearest(longitude, latitude);

  let nearestDistance = null;
  if (nearest) {
    const result = nearest.containsPoint(longitude, latitude);
    nearestDistance = result.distance;
  }

  res.json({
    success: true,
    data: {
      isInside: containing.length > 0,
      geofences: containing.map(c => ({
        id: c.geofence._id,
        name: c.geofence.name,
        type: c.geofence.type,
        distance: c.distance,
        radius: c.geofence.radius,
        color: c.geofence.color
      })),
      nearest: nearest ? {
        id: nearest._id,
        name: nearest.name,
        type: nearest.type,
        distance: nearestDistance,
        radius: nearest.radius,
        color: nearest.color,
        coordinates: {
          latitude: nearest.center.coordinates[1],
          longitude: nearest.center.coordinates[0]
        }
      } : null
    }
  });
});

/**
 * @desc    Get geofences near a location
 * @route   GET /api/v1/geofences/nearby
 * @access  Private
 */
exports.getNearbyGeofences = asyncHandler(async (req, res) => {
  const { latitude, longitude, maxDistance = 5000 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({
      success: false,
      message: 'Latitude and longitude are required'
    });
  }

  const geofences = await Geofence.find({
    center: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [parseFloat(longitude), parseFloat(latitude)]
        },
        $maxDistance: parseInt(maxDistance)
      }
    },
    isActive: true
  }).limit(10);

  res.json({
    success: true,
    count: geofences.length,
    data: geofences
  });
});
