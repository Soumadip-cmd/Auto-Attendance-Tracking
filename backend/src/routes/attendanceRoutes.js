const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Attendance = require('../models/Attendance');

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * @route   GET /api/v1/attendance/date/:date
 * @desc    Get all attendance records for a specific date (Admin only)
 * @access  Private/Admin
 */
router.get('/date/:date', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { date } = req.params;
    
    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log('📅 Admin fetching attendance for:', date);
    console.log('📅 Query:', { date: { $gte: queryDate, $lt: nextDay } });
    
    const attendance = await Attendance.find({
      date: { $gte: queryDate, $lt: nextDay }
    })
    .populate('user', 'firstName lastName email employeeId department isActive')
    .sort({ 'checkIn.time': -1 });
    
    console.log(`✅ Found ${attendance.length} records`);
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance.map(att => {
        const obj = att.toObject();
        return {
          ...obj,
          employee: obj.user  // Add employee alias for frontend
        };
      })
    });
  } catch (error) {
    console.error('❌ Error fetching attendance by date:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance/today
 * @desc    Get today's attendance for current user
 * @access  Private
 */
router.get('/today', protect, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: { $gte: today, $lt: tomorrow },
    }).sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance/history
 * @desc    Get attendance history for current user
 * @access  Private
 */
router.get('/history', protect, async (req, res, next) => {
  try {
    const { startDate, endDate, sortBy = 'date', sortOrder = 'desc', date } = req.query;
    
    let query = {};
    
    // If specific date requested (for admin view)
    if (date) {
      const queryDate = new Date(date);
      queryDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(queryDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      query.date = { $gte: queryDate, $lt: nextDay };
      console.log('📅 Admin querying attendance for date:', date);
      console.log('📅 Query range:', queryDate, 'to', nextDay);
    } else {
      // For regular user history
      query.user = req.user._id;
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }
    }
    
    const sortField = sortBy === 'date' ? 'date' : sortBy;
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    
    const attendance = await Attendance.find(query)
      .populate('user', 'firstName lastName email employeeId department')
      .sort({ [sortField]: sortDirection })
      .limit(100);
    
    console.log(`✅ Found ${attendance.length} attendance records`);
    if (attendance.length > 0) {
      console.log('📋 Sample record:', {
        id: attendance[0]._id,
        user: attendance[0].user?.firstName,
        date: attendance[0].date,
        status: attendance[0].status
      });
    }
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance.map(att => {
        const obj = att.toObject();
        return {
          ...obj,
          employee: obj.user || obj.employee  // Map 'user' to 'employee' for frontend compatibility
        };
      }),
    });
  } catch (error) {
    console.error('❌ Attendance history error:', error);
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance/stats
 * @desc    Get attendance statistics for current user
 * @access  Private
 */
router.get('/stats', protect, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = new Date(today);
    if (period === 'week') {
      startDate.setDate(today.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(today.getMonth() - 1);
    } else if (period === 'quarter') {
      startDate.setMonth(today.getMonth() - 3);
    }
    
    const attendanceRecords = await Attendance.find({
      user: req.user._id,
      date: { $gte: startDate },
    });
    
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(r => r.checkIn?.time).length;
    const lateDays = attendanceRecords.filter(r => r.isLate).length;
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.actualHours || 0), 0);
    
    // Calculate working days in period
    const workingDays = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) - Math.floor((today - startDate) / (1000 * 60 * 60 * 24 * 7)) * 2;
    const absentDays = Math.max(0, workingDays - presentDays);
    const attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
    
    res.status(200).json({
      success: true,
      data: {
        period,
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        totalHours: Math.round(totalHours * 10) / 10,
        attendanceRate,
        workingDays,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/attendance/check-in
 * @desc    Check in attendance
 * @access  Private
 */
router.post('/check-in', protect, async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, notes } = req.body;
    
    // Get current date (date only, no time)
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    // Check if already checked in today using date field
    const existingAttendance = await Attendance.findOne({
      user: req.user._id,
      date: currentDate,
    });
    
    // If attendance exists, check if they've already checked in
    if (existingAttendance && existingAttendance.checkIn && existingAttendance.checkIn.time) {
      // If they haven't checked out yet, they can't check in again
      if (!existingAttendance.checkOut || !existingAttendance.checkOut.time) {
        return res.status(400).json({
          success: false,
          message: 'You have already checked in today. Please check out first.',
          data: existingAttendance,
        });
      }
      
      // If they've already checked out, they shouldn't be able to check in again same day
      return res.status(400).json({
        success: false,
        message: 'You have already completed attendance for today (checked in and out).',
        data: existingAttendance,
      });
    }
    
    // Find geofence at this location to get expected check-in time
    const Geofence = require('../models/Geofence');
    let geofence = null;
    let status = 'present';
    
    if (latitude && longitude) {
      const geofences = await Geofence.find({
        isActive: true,
        center: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: 10000 // Search within 10km
          }
        }
      });
      
      // Find the geofence that contains this point
      for (const gf of geofences) {
        const distance = calculateDistance(
          latitude, 
          longitude, 
          gf.center.coordinates[1], 
          gf.center.coordinates[0]
        );
        if (distance <= gf.radius) {
          geofence = gf;
          break;
        }
      }
    }
    
    // Determine if employee is late based on geofence or default time
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    let lateThreshold = 9 * 60 + 15; // Default: 9:15 AM
    let expectedMinutes = 9 * 60; // Default: 9:00 AM
    
    if (geofence && geofence.checkInTime && geofence.checkInTime.expectedTime) {
      // Parse geofence expected time (HH:mm format)
      const [hours, minutes] = geofence.checkInTime.expectedTime.split(':').map(Number);
      expectedMinutes = hours * 60 + minutes;
      const gracePeriod = geofence.checkInTime.gracePeriodMinutes || 15;
      lateThreshold = expectedMinutes + gracePeriod;
    }
    
    status = currentMinutes > lateThreshold ? 'late' : 'present';
    const isLate = currentMinutes > lateThreshold;
    const lateBy = isLate ? Math.max(0, currentMinutes - expectedMinutes) : 0;
    
    // Create new attendance record
    const attendance = await Attendance.create({
      user: req.user._id,
      date: currentDate,
      checkIn: {
        time: new Date(),
        location: latitude && longitude ? {
          type: 'Point',
          coordinates: [longitude, latitude],
        } : undefined,
        method: 'manual',
        geofence: geofence?._id,
      },
      status: status,
      isLate: isLate,
      lateBy: lateBy,
      notes: notes || '',
      expectedHours: geofence?.workingHours ? 
        (() => {
          const [startHours, startMinutes] = geofence.workingHours.start.split(':').map(Number);
          const [endHours, endMinutes] = geofence.workingHours.end.split(':').map(Number);
          return (endHours * 60 + endMinutes - startHours * 60 - startMinutes) / 60;
        })() : 9,
    });
    
    await attendance.populate('user', 'firstName lastName employeeId email');
    
    res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/attendance/check-out
 * @desc    Check out attendance
 * @access  Private
 */
router.post('/check-out', protect, async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy, notes } = req.body;
    
    // Find today's attendance record
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const attendance = await Attendance.findOne({
      user: req.user._id,
      date: today,
      'checkOut.time': null,
    });
    
    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No active check-in found for today',
      });
    }
    
    // Find geofence to get working hours
    const Geofence = require('../models/Geofence');
    let geofence = null;
    
    if (latitude && longitude) {
      const geofences = await Geofence.find({
        isActive: true,
        center: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: 10000
          }
        }
      });
      
      for (const gf of geofences) {
        const distance = calculateDistance(
          latitude,
          longitude,
          gf.center.coordinates[1],
          gf.center.coordinates[0]
        );
        if (distance <= gf.radius) {
          geofence = gf;
          break;
        }
      }
    }
    
    // Update attendance with check-out info
    attendance.checkOut = {
      time: new Date(),
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      method: 'manual',
      geofence: geofence?._id,
    };
    
    // Calculate duration and working hours
    if (attendance.checkIn?.time) {
      const checkInTime = new Date(attendance.checkIn.time);
      const checkOutTime = new Date(attendance.checkOut.time);
      const durationMs = checkOutTime - checkInTime;
      const durationHours = durationMs / (1000 * 60 * 60);
      
      attendance.duration = Math.round(durationMs / (1000 * 60)); // minutes
      attendance.actualHours = Math.round(durationHours * 100) / 100; // hours with 2 decimals
      
      // Calculate expected working hours from geofence or use default
      let expectedHours = 9; // Default 9 hours
      
      if (geofence?.workingHours) {
        const [startHours, startMinutes] = geofence.workingHours.start.split(':').map(Number);
        const [endHours, endMinutes] = geofence.workingHours.end.split(':').map(Number);
        expectedHours = (endHours * 60 + endMinutes - startHours * 60 - startMinutes) / 60;
      }
      
      attendance.expectedHours = expectedHours;
      
      // Update status if checked out early or completed full day
      if (attendance.status === 'present' || attendance.status === 'late') {
        if (durationHours < expectedHours * 0.5) {
          attendance.status = 'half-day';
        }
      }
    }
    
    if (notes) {
      attendance.notes = attendance.notes ? `${attendance.notes}; ${notes}` : notes;
    }
    
    await attendance.save();
    
    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance/user/:userId
 * @desc    Get attendance records for a specific user
 * @access  Private
 */
router.get('/user/:userId', protect, async (req, res, next) => {
  try {
    const attendance = await Attendance.find({ user: req.params.userId })
      .sort('-checkIn');
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance/stats/dashboard
 * @desc    Get dashboard statistics
 * @access  Private/Admin
 */
router.get('/stats/dashboard', protect, authorize('admin'), async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalToday = await Attendance.countDocuments({
      checkIn: { $gte: today },
    });
    
    const presentToday = await Attendance.countDocuments({
      checkIn: { $gte: today },
      status: 'present',
    });
    
    const lateToday = await Attendance.countDocuments({
      checkIn: { $gte: today },
      status: 'late',
    });

    res.status(200).json({
      success: true,
      data: {
        totalToday,
        presentToday,
        lateToday,
        absentToday: 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/attendance
 * @desc    Manually create attendance record (for admins)
 * @access  Private/Admin
 */
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { employee, checkIn, checkOut, status, location } = req.body;
    
    if (!employee) {
      return res.status(400).json({
        success: false,
        message: 'Employee is required',
      });
    }
    
    if (!checkIn) {
      return res.status(400).json({
        success: false,
        message: 'Check-in time is required',
      });
    }
    
    // Get the date (without time) from checkIn
    const checkInDate = new Date(checkIn);
    const dateOnly = new Date(checkInDate);
    dateOnly.setHours(0, 0, 0, 0);
    
    // Check if attendance already exists for this employee on this date
    const existingAttendance = await Attendance.findOne({
      user: employee,
      date: dateOnly,
    });
    
    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already exists for this employee on this date',
      });
    }
    
    // Create attendance record with proper structure
    const attendanceData = {
      user: employee,
      date: dateOnly,
      status: status || 'present',
    };
    
    // For absent employees, don't set checkIn/checkOut times
    if (status === 'absent') {
      // Absent - no check-in or check-out times needed
      attendanceData.checkIn = {};
      attendanceData.checkOut = {};
    } else {
      // Present or Late - set check-in time
      attendanceData.checkIn = {
        time: new Date(checkIn),
        method: 'manual',
      };
      
      if (checkOut) {
        attendanceData.checkOut = {
          time: new Date(checkOut),
          method: 'manual',
        };
      }
      
      if (location) {
        attendanceData.checkIn.location = {
          type: 'Point',
          coordinates: [location.longitude || 0, location.latitude || 0],
        };
      }
    }
    
    const attendance = await Attendance.create(attendanceData);
    
    await attendance.populate('user', 'firstName lastName employeeId email');
    
    res.status(201).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/attendance
 * @desc    Get all attendance records (with optional date filter)
 * @access  Private/Admin
 */
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { date } = req.query;
    
    let query = {};
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.checkIn = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }
    
    const attendance = await Attendance.find(query)
      .populate('user', 'firstName lastName employeeId email department')
      .sort('-checkIn');
    
    res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/attendance/:id
 * @desc    Update attendance record
 * @access  Private/Admin
 */
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { checkIn, checkOut, status, location } = req.body;
    
    let attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }
    
    // Update fields if provided
    if (checkIn) {
      const checkInDate = new Date(checkIn);
      const dateOnly = new Date(checkInDate);
      dateOnly.setHours(0, 0, 0, 0);
      
      attendance.date = dateOnly;
      attendance.checkIn.time = new Date(checkIn);
    }
    
    if (checkOut) {
      if (!attendance.checkOut) {
        attendance.checkOut = {};
      }
      attendance.checkOut.time = new Date(checkOut);
      attendance.checkOut.method = 'manual';
    }
    
    if (status) {
      attendance.status = status;
    }
    
    if (location) {
      if (!attendance.checkIn.location) {
        attendance.checkIn.location = {};
      }
      attendance.checkIn.location.type = 'Point';
      attendance.checkIn.location.coordinates = [location.longitude || 0, location.latitude || 0];
    }
    
    await attendance.save();
    await attendance.populate('user', 'firstName lastName employeeId email');
    
    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/attendance/:id
 * @desc    Delete attendance record
 * @access  Private/Admin
 */
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found',
      });
    }
    
    await attendance.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully',
      data: {},
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;