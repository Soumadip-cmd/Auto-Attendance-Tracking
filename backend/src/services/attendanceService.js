const { Attendance, Location, Geofence, User, Event } = require('../models');
const logger = require('../config/logger');
const moment = require('moment-timezone');

class AttendanceService {
  /**
   * Create check-in record
   */
  async createCheckIn(userId, checkInData) {
    const { latitude, longitude, method, deviceId } = checkInData;

    // Get user
    const user = await User.findById(userId);
    if (!user. consentGiven || !user.trackingEnabled) {
      throw new Error('Location tracking not enabled or consent not given');
    }

    // Check if geofence exists at this location
    const geofences = await Geofence.findContainingPoint(longitude, latitude);
    const geofence = geofences[0]; // Use first matching geofence

    // Get today's date (date only, no time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    let attendance = await Attendance.findOne({
      user: userId,
      date: today
    });

    if (attendance && attendance.checkIn.time) {
      throw new Error('Already checked in today');
    }

    const checkInTime = new Date();

    // Determine if late
    const { isLate, lateBy } = this.checkIfLate(checkInTime, geofence);

    // Create or update attendance record
    if (! attendance) {
      attendance = await Attendance.create({
        user: userId,
        date: today,
        checkIn: {
          time: checkInTime,
          location: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          geofence: geofence?._id,
          method,
          device: deviceId
        },
        status: 'checked-in',
        isLate,
        lateBy
      });
    } else {
      attendance.checkIn = {
        time: checkInTime,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        geofence:  geofence?._id,
        method,
        device: deviceId
      };
      attendance. status = 'checked-in';
      attendance.isLate = isLate;
      attendance. lateBy = lateBy;
      await attendance.save();
    }

    // Log event
    await Event.log({
      eventType: 'attendance.checkin',
      actor: userId,
      resource: { type: 'attendance', id: attendance._id },
      severity: isLate ? 'warning' : 'info',
      details: {
        method,
        geofence: geofence?. name,
        time: checkInTime,
        isLate,
        lateBy
      },
      device: deviceId
    });

    // Send late notification if applicable
    if (isLate && lateBy > 15) {
      const emailService = require('./emailService');
      try {
        await emailService.sendAttendanceAlert(user, {
          type: 'Late Arrival',
          message: `You arrived ${lateBy} minutes late today. `,
          date: today. toDateString(),
          time: checkInTime. toLocaleTimeString(),
          location: geofence?.name || 'Unknown location'
        });
      } catch (error) {
        logger.error('Failed to send late arrival email:', error);
      }
    }

    return attendance;
  }

  /**
   * Create check-out record
   */
  async createCheckOut(userId, checkOutData) {
    const { latitude, longitude, method, deviceId } = checkOutData;

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find attendance record
    const attendance = await Attendance.findOne({
      user: userId,
      date:  today
    });

    if (!attendance || !attendance.checkIn.time) {
      throw new Error('No check-in record found for today');
    }

    if (attendance.checkOut. time) {
      throw new Error('Already checked out today');
    }

    // Check geofence
    const geofences = await Geofence.findContainingPoint(longitude, latitude);
    const geofence = geofences[0];

    const checkOutTime = new Date();

    // Calculate duration
    const durationMs = checkOutTime - attendance.checkIn. time;
    const durationMinutes = Math.floor(durationMs / (1000 * 60));
    const durationHours = durationMinutes / 60;

    // Check if early departure
    const { isEarly, earlyBy } = this. checkIfEarlyDeparture(checkOutTime, geofence);

    // Update attendance record
    attendance.checkOut = {
      time: checkOutTime,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      geofence: geofence?._id,
      method,
      device:  deviceId
    };
    attendance.duration = durationMinutes;
    attendance.actualHours = parseFloat(durationHours.toFixed(2));
    attendance.isEarlyDeparture = isEarly;
    attendance.earlyBy = earlyBy;
    attendance.status = this.calculateAttendanceStatus(attendance);

    await attendance.save();

    // Log event
    await Event.log({
      eventType: 'attendance.checkout',
      actor: userId,
      resource: { type:  'attendance', id: attendance._id },
      severity: isEarly ? 'warning' :  'info',
      details:  {
        method,
        geofence: geofence?.name,
        time: checkOutTime,
        duration: durationHours,
        isEarly,
        earlyBy
      },
      device: deviceId
    });

    return attendance;
  }

  /**
   * Get attendance records with filters
   */
  async getAttendanceRecords(filters = {}) {
    const {
      userId,
      department,
      startDate,
      endDate,
      status,
      page = 1,
      limit = 50
    } = filters;

    const query = {};

    if (userId) {
      query.user = userId;
    }

    if (department) {
      const users = await User.find({ department }).select('_id');
      query.user = { $in: users. map(u => u._id) };
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate('user', 'firstName lastName email employeeId department')
        .populate('checkIn.geofence', 'name type')
        .populate('checkOut. geofence', 'name type')
        .sort({ date: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Attendance.countDocuments(query)
    ]);

    return {
      records,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  /**
   * Get attendance summary for user or department
   */
  async getAttendanceSummary(filters = {}) {
    const { userId, department, startDate, endDate } = filters;

    const query = {};

    if (userId) {
      query.user = userId;
    }

    if (department) {
      const users = await User.find({ department }).select('_id');
      query.user = { $in: users.map(u => u._id) };
    }

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const records = await Attendance.find(query);

    // Calculate summary statistics
    const summary = {
      totalDays: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.isLate).length,
      halfDay: records.filter(r => r.status === 'half-day').length,
      onLeave: records.filter(r => r.status === 'on-leave').length,
      earlyDepartures: records.filter(r => r.isEarlyDeparture).length,
      averageWorkingHours: 0,
      totalWorkingHours: 0,
      attendanceRate: 0
    };

    // Calculate working hours
    const recordsWithHours = records.filter(r => r.actualHours > 0);
    if (recordsWithHours.length > 0) {
      summary.totalWorkingHours = recordsWithHours.reduce((sum, r) => sum + r.actualHours, 0);
      summary.averageWorkingHours = parseFloat((summary.totalWorkingHours / recordsWithHours.length).toFixed(2));
    }

    // Calculate attendance rate
    const workingDays = summary.present + summary.late + summary.halfDay;
    if (records.length > 0) {
      summary.attendanceRate = parseFloat(((workingDays / records.length) * 100).toFixed(2));
    }

    return summary;
  }

  /**
   * Get today's attendance status for user
   */
  async getTodayStatus(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance. findOne({
      user: userId,
      date: today
    })
      .populate('checkIn.geofence', 'name')
      .populate('checkOut. geofence', 'name');

    if (!attendance) {
      return {
        status: 'not-checked-in',
        message: 'You have not checked in today'
      };
    }

    return {
      status: attendance.status,
      checkIn: attendance.checkIn.time ?  {
        time: attendance.checkIn.time,
        location: attendance.checkIn.geofence?.name || 'Unknown',
        isLate: attendance.isLate,
        lateBy: attendance.lateBy
      } : null,
      checkOut: attendance.checkOut.time ? {
        time: attendance. checkOut.time,
        location: attendance.checkOut.geofence?.name || 'Unknown',
        isEarly: attendance.isEarlyDeparture,
        earlyBy: attendance.earlyBy
      } : null,
      duration: attendance.duration,
      actualHours: attendance. actualHours
    };
  }

  /**
   * Get attendance overview for admin/manager
   */
  async getAttendanceOverview(filters = {}) {
    const { department, date } = filters;

    const targetDate = date ?  new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const query = { date: targetDate };

    if (department) {
      const users = await User.find({ department, role: 'staff' }).select('_id');
      query.user = { $in: users.map(u => u._id) };
    }

    const [attendanceRecords, totalStaff] = await Promise.all([
      Attendance.find(query)
        .populate('user', 'firstName lastName employeeId department')
        .lean(),
      User.countDocuments(department ? { department, role: 'staff' } :  { role: 'staff' })
    ]);

    const overview = {
      date: targetDate,
      totalStaff,
      checkedIn: attendanceRecords. filter(r => r.checkIn.time).length,
      notCheckedIn: totalStaff - attendanceRecords.length,
      late: attendanceRecords.filter(r => r.isLate).length,
      onTime: attendanceRecords.filter(r => r.checkIn.time && ! r.isLate).length,
      records: attendanceRecords
    };

    return overview;
  }

  /**
   * Check if check-in is late
   */
  checkIfLate(checkInTime, geofence) {
    // Default start time:  9:00 AM
    let expectedStartTime = '09:00';

    if (geofence && geofence.workingHours && geofence.workingHours.enabled) {
      const dayOfWeek = checkInTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const schedule = geofence.workingHours.schedule. find(s => s.day === dayOfWeek);
      
      if (schedule) {
        expectedStartTime = schedule.startTime;
      }
    }

    const [expectedHour, expectedMinute] = expectedStartTime.split(':').map(Number);
    const expected = new Date(checkInTime);
    expected.setHours(expectedHour, expectedMinute, 0, 0);

    const graceMinutes = 15; // 15 minutes grace period
    const graceTime = new Date(expected. getTime() + graceMinutes * 60 * 1000);

    if (checkInTime > graceTime) {
      const lateBy = Math.floor((checkInTime - expected) / (1000 * 60));
      return { isLate: true, lateBy };
    }

    return { isLate:  false, lateBy: 0 };
  }

  /**
   * Check if check-out is early
   */
  checkIfEarlyDeparture(checkOutTime, geofence) {
    // Default end time: 6:00 PM
    let expectedEndTime = '18:00';

    if (geofence && geofence.workingHours && geofence.workingHours.enabled) {
      const dayOfWeek = checkOutTime.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const schedule = geofence.workingHours.schedule.find(s => s.day === dayOfWeek);
      
      if (schedule) {
        expectedEndTime = schedule.endTime;
      }
    }

    const [expectedHour, expectedMinute] = expectedEndTime.split(':').map(Number);
    const expected = new Date(checkOutTime);
    expected.setHours(expectedHour, expectedMinute, 0, 0);

    if (checkOutTime < expected) {
      const earlyBy = Math.floor((expected - checkOutTime) / (1000 * 60));
      
      // Only flag as early if more than 30 minutes early
      if (earlyBy > 30) {
        return { isEarly: true, earlyBy };
      }
    }

    return { isEarly:  false, earlyBy: 0 };
  }

  /**
   * Calculate final attendance status
   */
  calculateAttendanceStatus(attendance) {
    if (! attendance.checkIn.time) {
      return 'absent';
    }

    if (attendance.actualHours < 4) {
      return 'half-day';
    }

    if (attendance.isLate && attendance.lateBy > 60) {
      return 'late';
    }

    return 'present';
  }

  /**
   * Mark user as on leave
   */
  async markOnLeave(userId, date, reason = '') {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    let attendance = await Attendance.findOne({
      user: userId,
      date: targetDate
    });

    if (!attendance) {
      attendance = await Attendance.create({
        user: userId,
        date: targetDate,
        status: 'on-leave',
        notes: reason
      });
    } else {
      attendance.status = 'on-leave';
      attendance.notes = reason;
      await attendance.save();
    }

    await Event.log({
      eventType: 'attendance.leave-marked',
      actor: userId,
      resource: { type: 'attendance', id: attendance._id },
      severity: 'info',
      details: { date:  targetDate, reason }
    });

    return attendance;
  }

  /**
   * Generate attendance report
   */
  async generateReport(filters = {}) {
    const { userId, department, startDate, endDate, format = 'summary' } = filters;

    const records = await this.getAttendanceRecords({
      userId,
      department,
      startDate,
      endDate,
      limit: 10000
    });

    const summary = await this.getAttendanceSummary({
      userId,
      department,
      startDate,
      endDate
    });

    if (format === 'detailed') {
      return {
        summary,
        records: records. records,
        generatedAt: new Date()
      };
    }

    return {
      summary,
      generatedAt: new Date()
    };
  }
}

module.exports = new AttendanceService();