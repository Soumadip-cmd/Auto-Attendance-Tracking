const { asyncHandler } = require('../middleware/errorHandler');
const liveTrackingService = require('../services/liveTrackingService');

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
