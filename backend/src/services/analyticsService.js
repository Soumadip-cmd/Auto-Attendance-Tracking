const { Attendance, Location, User, Geofence, Event } = require('../models');
const moment = require('moment-timezone');
const logger = require('../config/logger');

class AnalyticsService {
  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(filters = {}) {
    const { department, startDate, endDate } = filters;

    const dateRange = {
      start: startDate ? new Date(startDate) : moment().subtract(30, 'days').toDate(),
      end: endDate ? new Date(endDate) : new Date()
    };

    // Build user query
    const userQuery = { role: 'staff', isActive: true };
    if (department) userQuery.department = department;

    const users = await User.find(userQuery).select('_id');
    const userIds = users.map(u => u._id);

    // Get various statistics in parallel
    const [
      attendanceStats,
      locationStats,
      productivityMetrics,
      geofenceUsage,
      recentAlerts
    ] = await Promise. all([
      this.getAttendanceStatistics(userIds, dateRange),
      this.getLocationStatistics(userIds, dateRange),
      this.getProductivityMetrics(userIds, dateRange),
      this.getGeofenceUsageStats(userIds, dateRange),
      this.getRecentAlerts(userIds, 10)
    ]);

    return {
      overview: {
        totalUsers: users.length,
        dateRange,
        department:  department || 'All Departments'
      },
      attendance: attendanceStats,
      location: locationStats,
      productivity: productivityMetrics,
      geofence: geofenceUsage,
      alerts: recentAlerts
    };
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStatistics(userIds, dateRange) {
    const attendanceRecords = await Attendance.find({
      user: { $in:  userIds },
      date: { $gte: dateRange.start, $lte: dateRange. end }
    });

    const totalDays = attendanceRecords.length;
    const present = attendanceRecords.filter(r => r.status === 'present').length;
    const late = attendanceRecords.filter(r => r.isLate).length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const halfDay = attendanceRecords.filter(r => r.status === 'half-day').length;
    const onLeave = attendanceRecords.filter(r => r.status === 'on-leave').length;

    // Calculate average working hours
    const recordsWithHours = attendanceRecords.filter(r => r. actualHours > 0);
    const avgWorkingHours = recordsWithHours.length > 0
      ? recordsWithHours.reduce((sum, r) => sum + r.actualHours, 0) / recordsWithHours.length
      : 0;

    // Calculate punctuality rate
    const punctualityRate = totalDays > 0
      ? ((totalDays - late) / totalDays) * 100
      : 0;

    // Get daily attendance trend
    const dailyTrend = await this.getDailyAttendanceTrend(userIds, dateRange);

    return {
      totalDays,
      present,
      late,
      absent,
      halfDay,
      onLeave,
      averageWorkingHours:  parseFloat(avgWorkingHours. toFixed(2)),
      attendanceRate: totalDays > 0 ? parseFloat(((present + late) / totalDays * 100).toFixed(2)) : 0,
      punctualityRate:  parseFloat(punctualityRate.toFixed(2)),
      dailyTrend
    };
  }

  /**
   * Get daily attendance trend
   */
  async getDailyAttendanceTrend(userIds, dateRange) {
    const trend = await Attendance.aggregate([
      {
        $match: {
          user: { $in: userIds },
          date: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', 'present'] }, 1, 0]
            }
          },
          late: {
            $sum: {
              $cond: ['$isLate', 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ['$status', 'absent'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    return trend.map(day => ({
      date: day._id,
      present: day.present,
      late: day.late,
      absent: day.absent
    }));
  }

  /**
   * Get location statistics
   */
  async getLocationStatistics(userIds, dateRange) {
    const locations = await Location.find({
      user: { $in: userIds },
      timestamp: { $gte: dateRange.start, $lte: dateRange.end }
    });

    const totalLocations = locations.length;
    
    // Count tracking types
    const trackingTypes = locations.reduce((acc, loc) => {
      acc[loc.trackingType] = (acc[loc.trackingType] || 0) + 1;
      return acc;
    }, {});

    // Calculate average accuracy
    const avgAccuracy = totalLocations > 0
      ?  locations.reduce((sum, loc) => sum + loc.accuracy, 0) / totalLocations
      :  0;

    // Calculate average battery level
    const locationsWithBattery = locations.filter(loc => loc.batteryLevel !== undefined);
    const avgBatteryLevel = locationsWithBattery.length > 0
      ?  locationsWithBattery.reduce((sum, loc) => sum + loc.batteryLevel, 0) / locationsWithBattery.length
      : 0;

    // Get most active users
    const userLocationCounts = await Location.aggregate([
      {
        $match: {
          user:  { $in: userIds },
          timestamp: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: '$user',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count:  -1 }
      },
      {
        $limit:  10
      }
    ]);

    const mostActiveUsers = await User.populate(userLocationCounts, {
      path: '_id',
      select: 'firstName lastName email'
    });

    return {
      totalLocations,
      trackingTypes,
      averageAccuracy:  parseFloat(avgAccuracy.toFixed(2)),
      averageBatteryLevel: parseFloat(avgBatteryLevel.toFixed(2)),
      mostActiveUsers: mostActiveUsers.map(u => ({
        user: u._id,
        locationCount: u.count
      }))
    };
  }

  /**
   * Get productivity metrics
   */
  async getProductivityMetrics(userIds, dateRange) {
    const attendanceRecords = await Attendance. find({
      user: { $in: userIds },
      date: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Calculate total productive hours
    const totalProductiveHours = attendanceRecords
      .filter(r => r. actualHours > 0)
      .reduce((sum, r) => sum + r.actualHours, 0);

    // Calculate average daily productive hours
    const daysWithData = new Set(attendanceRecords.map(r => r.date.toDateString())).size;
    const avgDailyHours = daysWithData > 0 ? totalProductiveHours / daysWithData : 0;

    // Get top performers
    const userProductivity = await Attendance.aggregate([
      {
        $match: {
          user: { $in: userIds },
          date: { $gte: dateRange.start, $lte: dateRange.end },
          actualHours: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$user',
          totalHours:  { $sum: '$actualHours' },
          daysPresent: { $sum: 1 },
          lateCount: {
            $sum: { $cond: ['$isLate', 1, 0] }
          }
        }
      },
      {
        $addFields: {
          avgHoursPerDay: { $divide: ['$totalHours', '$daysPresent'] }
        }
      },
      {
        $sort: { totalHours: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const topPerformers = await User.populate(userProductivity, {
      path: '_id',
      select: 'firstName lastName email employeeId'
    });

    // Identify low performers (less than 6 hours average)
    const lowPerformers = userProductivity
      .filter(u => u.avgHoursPerDay < 6)
      .slice(0, 10);

    const lowPerformersWithData = await User.populate(lowPerformers, {
      path: '_id',
      select: 'firstName lastName email employeeId'
    });

    return {
      totalProductiveHours:  parseFloat(totalProductiveHours. toFixed(2)),
      averageDailyHours: parseFloat(avgDailyHours. toFixed(2)),
      topPerformers: topPerformers.map(u => ({
        user: u._id,
        totalHours: parseFloat(u.totalHours.toFixed(2)),
        avgHoursPerDay: parseFloat(u.avgHoursPerDay.toFixed(2)),
        daysPresent: u. daysPresent,
        lateCount: u.lateCount
      })),
      lowPerformers: lowPerformersWithData. map(u => ({
        user: u._id,
        totalHours: parseFloat(u. totalHours.toFixed(2)),
        avgHoursPerDay: parseFloat(u.avgHoursPerDay.toFixed(2)),
        daysPresent: u.daysPresent
      }))
    };
  }

  /**
   * Get geofence usage statistics
   */
  async getGeofenceUsageStats(userIds, dateRange) {
    const locations = await Location.find({
      user: { $in: userIds },
      timestamp: { $gte: dateRange.start, $lte: dateRange.end },
      'geofences.0':  { $exists: true }
    }).populate('geofences.geofence', 'name type');

    // Count visits per geofence
    const geofenceVisits = {};
    locations.forEach(loc => {
      loc.geofences.forEach(gf => {
        if (gf.geofence) {
          const id = gf.geofence._id. toString();
          if (!geofenceVisits[id]) {
            geofenceVisits[id] = {
              geofence: gf.geofence,
              visits: 0,
              users: new Set()
            };
          }
          geofenceVisits[id].visits++;
          geofenceVisits[id].users. add(loc.user. toString());
        }
      });
    });

    // Convert to array and sort
    const geofenceStats = Object.values(geofenceVisits)
      .map(stat => ({
        geofence:  {
          id: stat.geofence._id,
          name: stat.geofence.name,
          type: stat.geofence.type
        },
        visits: stat. visits,
        uniqueUsers: stat.users.size
      }))
      .sort((a, b) => b.visits - a.visits);

    return {
      totalGeofences: geofenceStats.length,
      mostVisited: geofenceStats. slice(0, 5),
      leastVisited: geofenceStats.slice(-5).reverse()
    };
  }

  /**
   * Get recent alerts
   */
  async getRecentAlerts(userIds, limit = 10) {
    const alerts = await Event.find({
      actor: { $in: userIds },
      severity: { $in: ['warning', 'error', 'critical'] },
      eventType: { $in: [
        'geofence. violation',
        'location.tamper-detected',
        'attendance.checkin',
        'attendance.checkout'
      ] }
    })
      .populate('actor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return alerts. map(alert => ({
      id: alert._id,
      type: alert.eventType,
      severity: alert.severity,
      user: alert.actor,
      details: alert.details,
      timestamp: alert.createdAt
    }));
  }

  /**
   * Get user performance report
   */
  async getUserPerformanceReport(userId, startDate, endDate) {
    const dateRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get attendance records
    const attendanceRecords = await Attendance.find({
      user: userId,
      date: { $gte:  dateRange.start, $lte: dateRange.end }
    });

    // Calculate attendance metrics
    const totalDays = attendanceRecords.length;
    const present = attendanceRecords. filter(r => r.status === 'present').length;
    const late = attendanceRecords. filter(r => r.isLate).length;
    const absent = attendanceRecords.filter(r => r.status === 'absent').length;
    const halfDay = attendanceRecords.filter(r => r.status === 'half-day').length;

    const totalHours = attendanceRecords
      .filter(r => r. actualHours > 0)
      .reduce((sum, r) => sum + r.actualHours, 0);

    const avgHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

    // Get location statistics
    const locationCount = await Location.countDocuments({
      user: userId,
      timestamp: { $gte: dateRange.start, $lte: dateRange.end }
    });

    // Calculate punctuality score
    const punctualityScore = totalDays > 0 ? ((totalDays - late) / totalDays) * 100 : 0;

    // Calculate overall performance score
    const attendanceScore = totalDays > 0 ? (present / totalDays) * 100 : 0;
    const hoursScore = avgHoursPerDay >= 8 ? 100 : (avgHoursPerDay / 8) * 100;
    const overallScore = (attendanceScore * 0.5) + (punctualityScore * 0.3) + (hoursScore * 0.2);

    // Get recent violations
    const violations = await Event. find({
      actor: userId,
      eventType: { $in: ['geofence. violation', 'location.tamper-detected'] },
      createdAt: { $gte:  dateRange.start, $lte: dateRange.end }
    }).sort({ createdAt: -1 });

    return {
      user: {
        id: user._id,
        name: user.fullName,
        email: user. email,
        employeeId: user.employeeId,
        department: user.department
      },
      period: {
        start: dateRange.start,
        end: dateRange.end
      },
      attendance: {
        totalDays,
        present,
        late,
        absent,
        halfDay,
        attendanceRate: parseFloat(attendanceScore.toFixed(2))
      },
      productivity: {
        totalHours:  parseFloat(totalHours.toFixed(2)),
        avgHoursPerDay: parseFloat(avgHoursPerDay.toFixed(2)),
        hoursScore: parseFloat(hoursScore.toFixed(2))
      },
      punctuality: {
        lateCount: late,
        punctualityRate: parseFloat(punctualityScore.toFixed(2))
      },
      tracking: {
        locationUpdates: locationCount
      },
      violations:  violations.length,
      overallScore: parseFloat(overallScore.toFixed(2)),
      rating: this.getPerformanceRating(overallScore)
    };
  }

  /**
   * Get performance rating based on score
   */
  getPerformanceRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Satisfactory';
    return 'Needs Improvement';
  }

  /**
   * Get department comparison
   */
  async getDepartmentComparison(startDate, endDate) {
    const dateRange = {
      start: new Date(startDate),
      end: new Date(endDate)
    };

    const departments = await User.distinct('department', { role: 'staff', isActive: true });

    const comparisons = await Promise.all(
      departments.map(async dept => {
        const users = await User.find({ department: dept, role: 'staff' }).select('_id');
        const userIds = users.map(u => u._id);

        const attendanceRecords = await Attendance.find({
          user: { $in: userIds },
          date: { $gte: dateRange.start, $lte: dateRange.end }
        });

        const totalDays = attendanceRecords.length;
        const present = attendanceRecords. filter(r => r.status === 'present').length;
        const late = attendanceRecords. filter(r => r.isLate).length;

        const totalHours = attendanceRecords
          .filter(r => r.actualHours > 0)
          .reduce((sum, r) => sum + r.actualHours, 0);

        return {
          department: dept,
          userCount: users.length,
          attendanceRate: totalDays > 0 ? parseFloat(((present + late) / totalDays * 100).toFixed(2)) : 0,
          punctualityRate: totalDays > 0 ? parseFloat(((totalDays - late) / totalDays * 100).toFixed(2)) : 0,
          avgHoursPerDay: totalDays > 0 ? parseFloat((totalHours / totalDays).toFixed(2)) : 0
        };
      })
    );

    return comparisons.sort((a, b) => b.attendanceRate - a.attendanceRate);
  }

  /**
   * Get time-based heatmap data
   */
  async getTimeBasedHeatmap(filters = {}) {
    const { userId, department, startDate, endDate } = filters;

    const dateRange = {
      start: startDate ?  new Date(startDate) : moment().subtract(30, 'days').toDate(),
      end: endDate ? new Date(endDate) : new Date()
    };

    let userQuery = {};
    if (userId) {
      userQuery._id = userId;
    } else if (department) {
      userQuery.department = department;
    }

    const users = await User.find(userQuery).select('_id');
    const userIds = users.map(u => u._id);

    // Get location data grouped by hour and day of week
    const heatmapData = await Location. aggregate([
      {
        $match: {
          user: { $in: userIds },
          timestamp: { $gte: dateRange.start, $lte: dateRange.end }
        }
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$timestamp' },
            hour: { $hour: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 }
      }
    ]);

    // Convert to matrix format
    const matrix = Array(7).fill(null).map(() => Array(24).fill(0));
    
    heatmapData.forEach(data => {
      const day = data._id.dayOfWeek - 1; // Convert to 0-indexed
      const hour = data._id. hour;
      matrix[day][hour] = data.count;
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      matrix,
      labels: {
        days: dayNames,
        hours: Array. from({ length: 24 }, (_, i) => `${i}:00`)
      },
      totalDataPoints: heatmapData.reduce((sum, d) => sum + d.count, 0)
    };
  }

  /**
   * Detect anomalies in attendance patterns
   */
  async detectAnomalies(userId, days = 30) {
    const startDate = moment().subtract(days, 'days').toDate();
    const endDate = new Date();

    const attendanceRecords = await Attendance. find({
      user: userId,
      date: { $gte: startDate, $lte:  endDate }
    }).sort({ date: 1 });

    const anomalies = [];

    // Check for consecutive absences
    let consecutiveAbsences = 0;
    attendanceRecords.forEach((record, index) => {
      if (record.status === 'absent') {
        consecutiveAbsences++;
        if (consecutiveAbsences >= 3) {
          anomalies. push({
            type: 'consecutive_absences',
            severity: 'high',
            description: `${consecutiveAbsences} consecutive absences detected`,
            date: record.date,
            details: { count: consecutiveAbsences }
          });
        }
      } else {
        consecutiveAbsences = 0;
      }
    });

    // Check for unusual work hours
    const avgHours = attendanceRecords
      .filter(r => r. actualHours > 0)
      .reduce((sum, r) => sum + r.actualHours, 0) / attendanceRecords.length;

    attendanceRecords.forEach(record => {
      if (record.actualHours > 0) {
        if (record.actualHours < avgHours * 0.5) {
          anomalies. push({
            type: 'unusually_short_day',
            severity: 'medium',
            description: `Work hours (${record.actualHours}h) significantly below average (${avgHours. toFixed(2)}h)`,
            date: record.date,
            details: { hours: record.actualHours, average: avgHours }
          });
        } else if (record.actualHours > avgHours * 1.5 && record.actualHours > 10) {
          anomalies. push({
            type: 'unusually_long_day',
            severity: 'medium',
            description: `Work hours (${record.actualHours}h) significantly above average (${avgHours.toFixed(2)}h)`,
            date: record.date,
            details: { hours: record.actualHours, average: avgHours }
          });
        }
      }
    });

    // Check for late arrival patterns
    const lateCount = attendanceRecords.filter(r => r.isLate).length;
    const lateRate = (lateCount / attendanceRecords.length) * 100;

    if (lateRate > 30) {
      anomalies.push({
        type: 'high_late_rate',
        severity: 'high',
        description: `High late arrival rate:  ${lateRate.toFixed(2)}%`,
        details: { lateCount, totalDays: attendanceRecords. length, lateRate }
      });
    }

    return {
      userId,
      period: { start: startDate, end: endDate },
      anomaliesDetected: anomalies.length,
      anomalies: anomalies.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low:  1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      })
    };
  }

  /**
   * Get weekly summary report
   */
  async getWeeklySummary(startOfWeek) {
    const weekStart = moment(startOfWeek).startOf('week').toDate();
    const weekEnd = moment(startOfWeek).endOf('week').toDate();

    const users = await User.find({ role: 'staff', isActive: true });
    const userIds = users.map(u => u._id);

    const attendanceRecords = await Attendance.find({
      user: { $in: userIds },
      date: { $gte: weekStart, $lte: weekEnd }
    });

    // Group by day
    const dailySummary = {};
    for (let i = 0; i < 7; i++) {
      const date = moment(weekStart).add(i, 'days').format('YYYY-MM-DD');
      dailySummary[date] = {
        date,
        dayName: moment(weekStart).add(i, 'days').format('dddd'),
        present: 0,
        late:  0,
        absent: 0,
        onLeave: 0
      };
    }

    attendanceRecords.forEach(record => {
      const date = moment(record.date).format('YYYY-MM-DD');
      if (dailySummary[date]) {
        if (record.status === 'present') dailySummary[date].present++;
        if (record.isLate) dailySummary[date].late++;
        if (record.status === 'absent') dailySummary[date].absent++;
        if (record.status === 'on-leave') dailySummary[date].onLeave++;
      }
    });

    return {
      weekStart,
      weekEnd,
      totalStaff: users.length,
      dailySummary:  Object.values(dailySummary)
    };
  }
}

module.exports = new AnalyticsService();