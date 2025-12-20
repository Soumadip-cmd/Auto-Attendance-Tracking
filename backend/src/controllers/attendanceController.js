const { Attendance, Location, Geofence, Device, Event } = require('../models');
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

  // Get device
  const device = await Device.findOne({ user: req.user._id, deviceId });
  if (!device) {
    return res.status(400).json({
      success: false,
      message: 'Device not found'
    });
  }

  // Check if geofence exists at this location
  const geofences = await Geofence.findContainingPoint(longitude, latitude);
  const geofence = geofences[0]; // Use first matching geofence

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

  // Check if late based on geofence working hours
  let isLate = false;
  let lateByMinutes = 0;

  if (geofence && geofence.workingHours) {
    const dayOfWeek = checkInTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = `${checkInTime.getHours().toString().padStart(2, '0')}:${checkInTime.getMinutes().toString().padStart(2, '0')}`;

    let expectedStartTime = '09:00';
    
    // New schema: enabled + schedule
    if (geofence.workingHours.enabled && geofence.workingHours.schedule) {
      const schedule = geofence.workingHours.schedule.find(s => s.day === dayOfWeek);
      if (schedule && schedule.startTime) {
        expectedStartTime = schedule.startTime;
      }
    }
    // Old schema: simple start time
    else if (geofence.workingHours.start) {
      expectedStartTime = geofence.workingHours.start;
    }

    // Calculate if late (with 15 minute grace period) - only if we have a valid start time
    if (expectedStartTime && expectedStartTime.includes(':')) {
      const [expectedHour, expectedMinute] = expectedStartTime.split(':').map(Number);
      const expected = new Date(checkInTime);
      expected.setHours(expectedHour, expectedMinute, 0, 0);
      const gracePeriod = 15 * 60 * 1000; // 15 minutes
      
      if (checkInTime > new Date(expected.getTime() + gracePeriod)) {
        isLate = true;
        lateByMinutes = Math.floor((checkInTime - expected) / (1000 * 60));
      }
    }
  }

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
        geofence: geofence?._id,
        method,
        device: device._id
      },
      isLate,
      lateBy: lateByMinutes,
      status: 'checked-in'
    });
  } else {
    attendance.checkIn = {
      time: checkInTime,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      geofence: geofence?._id,
      method,
      device: device._id
    };
    attendance.isLate = isLate;
    attendance.lateBy = lateByMinutes;
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
      geofence: geofence?.name,
      time: checkInTime
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
      time: checkInTime,
      geofence: geofence?.name
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

  // Get device
  const device = await Device.findOne({ user: req.user._id, deviceId });

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

  const checkOutTime = new Date();

  // Find geofence if location provided
  let geofence;
  if (latitude && longitude) {
    const geofences = await Geofence.findContainingPoint(longitude, latitude);
    geofence = geofences[0];
  }

  // Use check-in geofence if checkout geofence not found
  if (!geofence && attendance.checkIn?.geofence) {
    geofence = await Geofence.findById(attendance.checkIn.geofence);
  }

  // Check if early departure based on geofence working hours
  let isEarlyDeparture = false;
  let earlyByMinutes = 0;

  if (geofence && geofence.workingHours) {
    const dayOfWeek = checkOutTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
    let expectedEndTime = '18:00';
    
    // New schema: enabled + schedule
    if (geofence.workingHours.enabled && geofence.workingHours.schedule) {
      const schedule = geofence.workingHours.schedule.find(s => s.day === dayOfWeek);
      if (schedule && schedule.endTime) {
        expectedEndTime = schedule.endTime;
      }
    }
    // Old schema: simple end time
    else if (geofence.workingHours.end) {
      expectedEndTime = geofence.workingHours.end;
    }

    // Calculate if early departure - only if we have a valid end time
    if (expectedEndTime && expectedEndTime.includes(':')) {
      const [expectedHour, expectedMinute] = expectedEndTime.split(':').map(Number);
      const expected = new Date(checkOutTime);
      expected.setHours(expectedHour, expectedMinute, 0, 0);
      
      if (checkOutTime < expected) {
        isEarlyDeparture = true;
        earlyByMinutes = Math.floor((expected - checkOutTime) / (1000 * 60));
      }
    }
  }

  // Update attendance
  attendance.checkOut = {
    time: checkOutTime,
    location: latitude && longitude ? {
      type: 'Point',
      coordinates: [longitude, latitude]
    } : undefined,
    geofence: geofence?._id,
    method,
    device: device?._id
  };

  attendance.isEarlyDeparture = isEarlyDeparture;
  attendance.earlyBy = earlyByMinutes;

  await attendance.save();

  // Log event
  await Event.log({
    eventType: 'attendance.checkout',
    actor: req.user._id,
    resource: { type: 'attendance', id: attendance._id },
    severity: 'info',
    details: {
      method,
      geofence: geofence?.name,
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
      duration: attendance.duration,
      geofence: geofence?.name
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
    .populate('checkIn.geofence', 'name type')
    .populate('checkOut.geofence', 'name type')
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
  })
    .populate('checkIn.geofence', 'name type')
    .populate('checkOut.geofence', 'name type');

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
