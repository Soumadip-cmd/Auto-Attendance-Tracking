const { asyncHandler } = require('../middleware/errorHandler');
const liveTrackingService = require('../services/liveTrackingService');
const { Event, Geofence } = require('../models');

/**
 * @desc    Submit current teacher location through REST fallback
 * @route   POST /api/v1/live-tracking/location
 * @access  Private/Teacher
 */
exports.submitLocation = asyncHandler(async (req, res) => {
  const io = req.app.get('io');
  const result = await liveTrackingService.processTeacherLocation({
    user: req.user,
    location: req.body,
    io,
    source: req.body.source || 'rest',
    requestContext: {
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  res.status(201).json({
    success: true,
    data: result.payload,
    validation: result.validation
  });
});

/**
 * @desc    List current live teacher locations for super admin/admin/HOD
 * @route   GET /api/v1/live-tracking/live
 * @access  Private/Admin/HOD
 */
exports.getLiveLocations = asyncHandler(async (req, res) => {
  const data = await liveTrackingService.listLiveLocations(req.user, req.query);

  res.json({
    success: true,
    count: data.length,
    data
  });
});

/**
 * @desc    Get one teacher's latest live location
 * @route   GET /api/v1/live-tracking/teacher/:teacherId
 * @access  Private/Admin/HOD/Teacher owner
 */
exports.getTeacherLiveLocation = asyncHandler(async (req, res) => {
  const data = await liveTrackingService.listLiveLocations(req.user, {
    activeWithinMinutes: req.query.activeWithinMinutes || 120
  });

  const teacher = data.find((location) => location.userId === req.params.teacherId);

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: 'Live location not found for this teacher'
    });
  }

  res.json({
    success: true,
    data: teacher
  });
});

/**
 * @desc    Get recorded movement trail for a teacher
 * @route   GET /api/v1/live-tracking/teacher/:teacherId/trail
 * @access  Private/Admin/HOD/Teacher owner
 */
exports.getTeacherTrail = asyncHandler(async (req, res) => {
  const data = await liveTrackingService.getTeacherTrail(req.user, req.params.teacherId, req.query);

  res.json({
    success: true,
    data
  });
});

/**
 * @desc    Teacher stops live tracking
 * @route   POST /api/v1/live-tracking/stop
 * @access  Private
 */
exports.stopTracking = asyncHandler(async (req, res) => {
  await liveTrackingService.stopTeacherTracking(req.user._id);
  const io = req.app.get('io');

  if (io) {
    io.to('admin-room').emit('live-location:stopped', {
      userId: req.user._id,
      teacher: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email
      },
      timestamp: new Date()
    });
  }

  res.json({
    success: true,
    message: 'Live tracking stopped'
  });
});

/**
 * @desc    Submit native device geofence transition event
 * @route   POST /api/v1/live-tracking/geofence-event
 * @access  Private
 */
exports.submitGeofenceEvent = asyncHandler(async (req, res) => {
  const { geofenceId, eventType, latitude, longitude, timestamp } = req.body;
  const normalizedType = eventType === 'exit' ? 'exit' : 'enter';
  const geofence = geofenceId ? await Geofence.findById(geofenceId) : null;

  const event = await Event.log({
    eventType: normalizedType === 'exit' ? 'geofence.exited' : 'geofence.entered',
    actor: req.user._id,
    target: req.user._id,
    resource: geofence ? { type: 'geofence', id: geofence._id } : undefined,
    severity: normalizedType === 'exit' ? 'warning' : 'info',
    status: normalizedType === 'exit' ? 'warning' : 'success',
    details: {
      geofenceName: geofence?.name,
      latitude,
      longitude,
      timestamp: timestamp || new Date()
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  const io = req.app.get('io');
  if (io) {
    const payload = {
      userId: req.user._id,
      teacher: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        employeeId: req.user.employeeId
      },
      geofence: geofence ? {
        id: geofence._id,
        name: geofence.name,
        radius: geofence.radius,
        coordinates: {
          latitude: geofence.center.coordinates[1],
          longitude: geofence.center.coordinates[0]
        }
      } : null,
      eventType: normalizedType,
      latitude,
      longitude,
      timestamp: timestamp || new Date()
    };

    io.to('admin-room').emit('teacher:geofence:event', payload);
    io.to(`user:${req.user._id}`).emit('teacher:geofence:event', payload);
  }

  res.status(201).json({
    success: true,
    data: event
  });
});
