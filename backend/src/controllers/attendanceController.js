const { Attendance, Location, Device, Event, Geofence } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @desc    Check in
 * @route   POST /api/v1/attendance/checkin
 * @access  Private
 */
exports.checkIn = asyncHandler(async (req, res) => {
  const { latitude, longitude, method, deviceId } = req.body;

  if (!req.user.consentGiven || !req.user.trackingEnabled) {
    return res.status(403).json({
      success: false,
      message: 'Location tracking not enabled or consent not given'
    });
  }

  // Check if location is within any geofence
  const containingGeofences = await Geofence.findContainingPoint(longitude, latitude);
  
  if (containingGeofences.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'You must be within an office location to check in',
      errorCode: 'OUTSIDE_GEOFENCE'
    });
  }

  const primaryGeofence = containingGeofences[0]; // Use the closest geofence

  // Check working hours if enabled
  if (primaryGeofence.workingHours?.enabled) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const gracePeriod = primaryGeofence.workingHours.gracePeriod || 15;
    
    // Convert time strings to minutes for comparison
    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const currentMinutes = timeToMinutes(currentTime);
    const startMinutes = timeToMinutes(primaryGeofence.workingHours.startTime) - gracePeriod;
    const endMinutes = timeToMinutes(primaryGeofence.workingHours.endTime) + gracePeriod;
    
    if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
      return res.status(400).json({
        success: false,
        message: `Check-in only allowed between ${primaryGeofence.workingHours.startTime} and ${primaryGeofence.workingHours.endTime} (±${gracePeriod} min grace period)`,
        errorCode: 'OUTSIDE_WORKING_HOURS',
        workingHours: {
          start: primaryGeofence.workingHours.startTime,
          end: primaryGeofence.workingHours.endTime,
          gracePeriod: gracePeriod
        }
      });
    }
  }

  // Get device
  const device = await Device.findOne({ user: req.user._id, deviceId });
  if (!device) {
    return res.status(400).json({
      success: false,
      message: 'Device not found'
    });
  }

  // Get today's date (date only, no time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already checked in today
  let attendance = await Attendance.findOne({
    user: req.user._id,
    date: today
  });

  if (attendance && attendance.checkIn.time) {
    return res.status(400).json({
      success: false,
      message: 'Already checked in today'
    });
  }

  const checkInTime = new Date();

  // Create or update attendance record
  if (!attendance) {
    attendance = await Attendance.create({
      user: req.user._id,
      date: today,
      checkIn: {
        time: checkInTime,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        method,
        device: device._id
      },
      status: 'checked-in'
    });
  } else {
    attendance.checkIn = {
      time: checkInTime,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      method,
      device: device._id
    };
    attendance.status = 'checked-in';
    await attendance.save();
  }

  // Log event
  await Event.log({
    eventType: 'attendance.checkin',
    actor: req.user._id,
    resource: { type: 'attendance', id: attendance._id },
    severity: 'info',
    details: {
      method,
      time: checkInTime,
      geofence: {
        id: primaryGeofence.geofence._id,
        name: primaryGeofence.geofence.name,
        distance: primaryGeofence.distance
      }
    },
    device: device._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  // Emit real-time update
  if (req.app.io) {
    req.app.io.to('admin-room').emit('attendance:checkin', {
      userId: req.user._id,
      userName: req.user.fullName,
      time: checkInTime
    });
  }

  res.status(201).json({
    success: true,
    data: { attendance }
  });
});

/**
 * @desc    Check out
 * @route   POST /api/v1/attendance/checkout
 * @access  Private
 */
exports.checkOut = asyncHandler(async (req, res) => {
  const { latitude, longitude, method, deviceId } = req.body;

  // Get today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    user: req.user._id,
    date: today
  });

  if (!attendance || !attendance.checkIn.time) {
    return res.status(400).json({
      success: false,
      message: 'No check-in record found for today'
    });
  }

  if (attendance.checkOut.time) {
    return res.status(400).json({
      success: false,
      message: 'Already checked out today'
    });
  }

  // Check working hours if location provided
  if (latitude && longitude) {
    const containingGeofences = await Geofence.findContainingPoint(longitude, latitude);
    
    if (containingGeofences.length > 0) {
      const primaryGeofence = containingGeofences[0];
      
      if (primaryGeofence.workingHours?.enabled) {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const gracePeriod = primaryGeofence.workingHours.gracePeriod || 15;
        
        const timeToMinutes = (timeStr) => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          return hours * 60 + minutes;
        };
        
        const currentMinutes = timeToMinutes(currentTime);
        const startMinutes = timeToMinutes(primaryGeofence.workingHours.startTime) - gracePeriod;
        const endMinutes = timeToMinutes(primaryGeofence.workingHours.endTime) + gracePeriod;
        
        if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
          return res.status(400).json({
            success: false,
            message: `Check-out only allowed between ${primaryGeofence.workingHours.startTime} and ${primaryGeofence.workingHours.endTime} (±${gracePeriod} min grace period)`,
            errorCode: 'OUTSIDE_WORKING_HOURS'
          });
        }
      }
    }
  }

  // Get device
  const device = await Device.findOne({ user: req.user._id, deviceId });

  const checkOutTime = new Date();

  // Update attendance
  attendance.checkOut = {
    time: checkOutTime,
    location: latitude && longitude ? {
      type: 'Point',
      coordinates: [longitude, latitude]
    } : undefined,
    method,
    device: device?._id
  };

  await attendance.save();

  // Log event
  await Event.log({
    eventType: 'attendance.checkout',
    actor: req.user._id,
    resource: { type: 'attendance', id: attendance._id },
    severity: 'info',
    details: {
      method,
      time: checkOutTime,
      duration: attendance.duration
    },
    device: device?._id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  // Emit real-time update
  if (req.app.io) {
    req.app.io.to('admin-room').emit('attendance:checkout', {
      userId: req.user._id,
      userName: req.user.fullName,
      time: checkOutTime,
      duration: attendance.duration
    });
  }

  res.json({
    success: true,
    data: { attendance }
  });
});

/**
 * @desc    Get attendance records
 * @route   GET /api/v1/attendance/records
 * @access  Private
 */
exports.getRecords = asyncHandler(async (req, res) => {
  const {
    userId,
    startDate,
    endDate,
    status,
    limit = 30,
    page = 1
  } = req.query;

  // Determine whose records to retrieve
  let targetUserId = req.user._id;
  if (userId && (req.user.role === 'admin' || req.user.role === 'manager')) {
    targetUserId = userId;
  } else if (userId && userId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view other users\' attendance records'
    });
  }

  const query = { user: targetUserId };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;
  const records = await Attendance.find(query)
    .sort({ date: -1 })
    .limit(parseInt(limit))
    .skip(skip)
    .populate('user', 'firstName lastName email department');

  const total = await Attendance.countDocuments(query);

  res.json({
    success: true,
    data: {
      records,
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
 * @desc    Get attendance summary
 * @route   GET /api/v1/attendance/summary
 * @access  Private
 */
exports.getSummary = asyncHandler(async (req, res) => {
  const { userId, startDate, endDate } = req.query;

  // Determine whose summary to retrieve
  let targetUserId = req.user._id;
  if (userId && (req.user.role === 'admin' || req.user.role === 'manager')) {
    targetUserId = userId;
  } else if (userId && userId !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view other users\' attendance summary'
    });
  }

  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // Default to current month
  const end = endDate ? new Date(endDate) : new Date();

  const summary = await Attendance.getUserSummary(targetUserId, start, end);

  res.json({
    success: true,
    data: {
      summary,
      period: {
        startDate: start,
        endDate: end
      }
    }
  });
});

/**
 * @desc    Get today's attendance status
 * @route   GET /api/v1/attendance/today
 * @access  Private
 */
exports.getTodayStatus = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await Attendance.findOne({
    user: req.user._id,
    date: today
  });

  res.json({
    success: true,
    data: {
      attendance,
      isCheckedIn: attendance && attendance.checkIn.time && !attendance.checkOut.time
    }
  });
});

/**
 * @desc    Get attendance overview (admin/manager)
 * @route   GET /api/v1/attendance/overview
 * @access  Private (Admin/Manager)
 */
exports.getOverview = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's statistics
  const todayStats = await Attendance.aggregate([
    {
      $match: { date: today }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get currently checked in users
  const checkedIn = await Attendance.find({
    date: today,
    status: 'checked-in'
  })
    .populate('user', 'firstName lastName email department profileImage')
    .select('checkIn user');

  const stats = {
    checkedIn: 0,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0
  };

  todayStats.forEach(stat => {
    stats[stat._id === 'checked-in' ? 'checkedIn' : stat._id] = stat.count;
  });

  res.json({
    success: true,
    data: {
      stats,
      checkedInUsers: checkedIn.map(a => ({
        user: a.user,
        checkInTime: a.checkIn.time
      }))
    }
  });
});
