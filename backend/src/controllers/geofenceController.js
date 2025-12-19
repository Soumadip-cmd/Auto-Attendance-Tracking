const { Geofence, Event } = require('../models');
const asyncHandler = require('express-async-handler');

/**
 * @desc    Create geofence
 * @route   POST /api/v1/geofences
 * @access  Private (Admin)
 */
exports.createGeofence = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    type,
    latitude,
    longitude,
    radius,
    address,
    workingHours,
    alerts,
    color,
    assignedUsers
  } = req.body;

  const geofence = await Geofence.create({
    name,
    description,
    type,
    center: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    radius,
    address,
    workingHours,
    alerts,
    color,
    assignedUsers,
    createdBy: req.user._id
  });

  await Event.log({
    eventType: 'geofence.create',
    actor: req.user._id,
    resource: { type: 'geofence', id: geofence._id },
    severity: 'info',
    details: { name, type, radius },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    data: { geofence }
  });
});

/**
 * @desc    Get all geofences
 * @route   GET /api/v1/geofences
 * @access  Private
 */
exports.getGeofences = asyncHandler(async (req, res) => {
  const { type, isActive } = req.query;

  const query = {};
  if (type) query.type = type;
  if (typeof isActive !== 'undefined') query.isActive = isActive === 'true';

  const geofences = await Geofence.find(query)
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: geofences.length,
    data: geofences,
  });
});

/**
 * @desc    Get single geofence
 * @route   GET /api/v1/geofences/:id
 * @access  Private
 */
exports.getGeofence = asyncHandler(async (req, res) => {
  const geofence = await Geofence.findById(req.params.id)
    .populate('createdBy', 'firstName lastName')
    .populate('assignedUsers', 'firstName lastName email department');

  if (!geofence) {
    return res.status(404).json({
      success: false,
      message: 'Geofence not found'
    });
  }

  res.json({
    success: true,
    data: { geofence }
  });
});

/**
 * @desc    Update geofence
 * @route   PUT /api/v1/geofences/:id
 * @access  Private (Admin)
 */
exports.updateGeofence = asyncHandler(async (req, res) => {
  let geofence = await Geofence.findById(req.params.id);

  if (!geofence) {
    return res.status(404).json({
      success: false,
      message: 'Geofence not found'
    });
  }

  const updateData = { ...req.body };

  // Update center if latitude/longitude provided
  if (req.body.latitude && req.body.longitude) {
    updateData.center = {
      type: 'Point',
      coordinates: [req.body.longitude, req.body.latitude]
    };
    delete updateData.latitude;
    delete updateData.longitude;
  }

  updateData.updatedBy = req.user._id;

  geofence = await Geofence.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  await Event.log({
    eventType: 'geofence.update',
    actor: req.user._id,
    resource: { type: 'geofence', id: geofence._id },
    severity: 'info',
    details: { name: geofence.name, changes: Object.keys(updateData) },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    data: { geofence }
  });
});

/**
 * @desc    Delete geofence
 * @route   DELETE /api/v1/geofences/:id
 * @access  Private (Admin)
 */
exports.deleteGeofence = asyncHandler(async (req, res) => {
  const geofence = await Geofence.findById(req.params.id);

  if (!geofence) {
    return res.status(404).json({
      success: false,
      message: 'Geofence not found'
    });
  }

  await Geofence.findByIdAndDelete(req.params.id);

  await Event.log({
    eventType: 'geofence.delete',
    actor: req.user._id,
    resource: { type: 'geofence', id: geofence._id },
    severity: 'warning',
    details: { name: geofence.name },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Geofence deleted successfully'
  });
});

/**
 * @desc    Check if location is within geofence
 * @route   POST /api/v1/geofences/check
 * @access  Private
 */
exports.checkLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude } = req.body;

  const geofences = await Geofence.findContainingPoint(longitude, latitude);

  res.json({
    success: true,
    data: {
      isInside: geofences.length > 0,
      geofences: geofences.map(gf => ({
        _id: gf._id,
        name: gf.name,
        type: gf.type,
        radius: gf.radius,
        center: {
          latitude: gf.center.coordinates[1],
          longitude: gf.center.coordinates[0]
        },
        workingHours: gf.workingHours,
        alerts: gf.alerts,
        color: gf.color
      }))
    }
  });
});
