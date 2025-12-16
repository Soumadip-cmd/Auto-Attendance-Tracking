const User = require('../models/User');
const Attendance = require('../models/Attendance');

// Generate report based on type and date range
exports.generateReport = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;

    if (!type || !startDate || ! endDate) {
      return res.status(400).json({
        success: false,
        message: 'Report type, start date, and end date are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all attendance records in date range
    const attendanceRecords = await Attendance.find({
      checkIn: { $gte: start, $lte: end }
    }).populate('employee', 'firstName lastName employeeId department');

    // Get total employees
    const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' } });

    // Calculate statistics
    const totalPresent = attendanceRecords.filter(a => 
      a.status === 'present' || a.status === 'late'
    ).length;
    const totalLate = attendanceRecords.filter(a => a.status === 'late').length;
    const totalAbsent = attendanceRecords.filter(a => a.status === 'absent').length;

    const avgAttendance = totalEmployees > 0 
      ?  ((totalPresent / (totalPresent + totalAbsent + totalLate)) * 100).toFixed(1)
      : 0;

    const reportData = {
      type,
      period: `${startDate} to ${endDate}`,
      startDate,
      endDate,
      totalEmployees,
      totalPresent,
      totalLate,
      totalAbsent,
      avgAttendance:  parseFloat(avgAttendance),
      records: attendanceRecords,
      generatedAt: new Date()
    };

    res.json({
      success: true,
      data: reportData
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report',
      error: error.message
    });
  }
};

// Get daily report
exports.getDailyReport = async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const attendanceRecords = await Attendance.find({
      checkIn: { $gte: targetDate, $lt: nextDay }
    }).populate('employee', 'firstName lastName employeeId department');

    const totalEmployees = await User.countDocuments({ role: { $ne:  'admin' } });

    const present = attendanceRecords.filter(a => a.status === 'present').length;
    const late = attendanceRecords.filter(a => a.status === 'late').length;
    const absent = totalEmployees - attendanceRecords. length;

    res.json({
      success: true,
      data: {
        date,
        totalEmployees,
        present,
        late,
        absent,
        attendanceRate: totalEmployees > 0 ? ((present / totalEmployees) * 100).toFixed(1) : 0,
        records: attendanceRecords
      }
    });
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily report',
      error: error.message
    });
  }
};

// Get weekly report
exports.getWeeklyReport = async (req, res) => {
  try {
    const { startDate, endDate } = req. params;

    if (!startDate || !endDate) {
      return res. status(400).json({
        success: false,
        message:  'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance. find({
      checkIn: { $gte: start, $lte: end }
    }).populate('employee', 'firstName lastName employeeId department');

    const totalEmployees = await User.countDocuments({ role: { $ne:  'admin' } });

    // Group by day
    const dailyStats = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    attendanceRecords.forEach(record => {
      const day = new Date(record.checkIn).toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { present: 0, late: 0, absent: 0 };
      }
      if (record.status === 'present') dailyStats[day].present++;
      else if (record.status === 'late') dailyStats[day].late++;
      else if (record.status === 'absent') dailyStats[day].absent++;
    });

    res.json({
      success: true,
      data: {
        period: `${startDate} to ${endDate}`,
        totalEmployees,
        dailyStats,
        totalRecords: attendanceRecords.length,
        records: attendanceRecords
      }
    });
  } catch (error) {
    console.error('Weekly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly report',
      error: error.message
    });
  }
};

// Get monthly report
exports.getMonthlyReport = async (req, res) => {
  try {
    const { month, year } = req.params;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendanceRecords = await Attendance.find({
      checkIn: { $gte: startDate, $lte: endDate }
    }).populate('employee', 'firstName lastName employeeId department');

    const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' } });

    const totalPresent = attendanceRecords. filter(a => a.status === 'present').length;
    const totalLate = attendanceRecords.filter(a => a. status === 'late').length;
    const totalAbsent = attendanceRecords.filter(a => a.status === 'absent').length;

    // Department-wise breakdown
    const departmentStats = {};
    attendanceRecords.forEach(record => {
      const dept = record.employee?. department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { present: 0, late: 0, absent: 0 };
      }
      if (record.status === 'present') departmentStats[dept]. present++;
      else if (record.status === 'late') departmentStats[dept].late++;
      else if (record.status === 'absent') departmentStats[dept].absent++;
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    res.json({
      success: true,
      data: {
        month:  monthNames[month - 1],
        year,
        totalEmployees,
        totalPresent,
        totalLate,
        totalAbsent,
        avgAttendance: totalEmployees > 0 
          ? ((totalPresent / totalEmployees) * 100).toFixed(1) 
          : 0,
        departmentStats,
        records: attendanceRecords
      }
    });
  } catch (error) {
    console.error('Monthly report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly report',
      error: error.message
    });
  }
};

// Export report data
exports.exportReportData = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    if (!startDate || !endDate) {
      return res. status(400).json({
        success: false,
        message:  'Start date and end date are required'
      });
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const attendanceRecords = await Attendance. find({
      checkIn: { $gte: start, $lte: end }
    }).populate('employee', 'firstName lastName employeeId department email');

    // Format data for export
    const exportData = attendanceRecords.map(record => ({
      'Employee ID': record.employee?. employeeId || 'N/A',
      'First Name': record.employee?.firstName || 'N/A',
      'Last Name': record.employee?. lastName || 'N/A',
      'Department': record.employee?.department || 'N/A',
      'Check In': record.checkIn ?  new Date(record.checkIn).toLocaleString() : 'N/A',
      'Check Out':  record.checkOut ? new Date(record.checkOut).toLocaleString() : 'N/A',
      'Status': record. status,
      'Location': record.location?. address || 'N/A',
      'Duration': record.checkIn && record.checkOut 
        ? `${Math.floor((new Date(record.checkOut) - new Date(record.checkIn)) / 60000)} minutes`
        : 'N/A'
    }));

    res.json({
      success: true,
      data: exportData,
      count: exportData.length,
      format
    });
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report data',
      error:  error.message
    });
  }
};