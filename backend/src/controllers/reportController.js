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

    console.log('📊 Generating daily report for:', date);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const attendanceRecords = await Attendance.find({
      date: { $gte: targetDate, $lt: nextDay }
    }).populate('user', 'firstName lastName employeeId department');

    console.log(`✅ Found ${attendanceRecords.length} attendance records`);

    // Transform records to include employee field
    const formattedRecords = attendanceRecords.map(record => ({
      ...record.toObject(),
      employee: record.user,
      name: record.user ? `${record.user.firstName} ${record.user.lastName}` : 'N/A',
      department: record.user?.department || 'N/A',
      checkIn: record.checkIn?.time,
      checkOut: record.checkOut?.time
    }));

    const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' }, isActive: true });

    const present = attendanceRecords.filter(a => a.status === 'present').length;
    const late = attendanceRecords.filter(a => a.status === 'late').length;
    const checkedIn = attendanceRecords.filter(a => a.checkIn?.time).length;
    const absent = totalEmployees - checkedIn;

    console.log('📊 Stats:', { present, late, absent, totalEmployees });

    res.json({
      success: true,
      data: formattedRecords
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

    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).populate('user', 'firstName lastName employeeId department');

    const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' }, isActive: true });

    // Group by day
    const dailyStats = {};
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    attendanceRecords.forEach(record => {
      const day = new Date(record.date).toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = { present: 0, late: 0, absent: 0 };
      }
      if (record.status === 'present') dailyStats[day].present++;
      else if (record.status === 'late') dailyStats[day].late++;
      else if (record.status === 'absent') dailyStats[day].absent++;
    });

    // Format records for frontend
    const formattedRecords = attendanceRecords.map(record => ({
      ...record.toObject(),
      employee: record.user,
      name: record.user ? `${record.user.firstName} ${record.user.lastName}` : 'N/A',
      department: record.user?.department || 'N/A',
      checkIn: record.checkIn?.time,
      checkOut: record.checkOut?.time
    }));

    res.json({
      success: true,
      data: formattedRecords
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
      date: { $gte: startDate, $lte: endDate }
    }).populate('user', 'firstName lastName employeeId department');

    const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' }, isActive: true });

    const totalPresent = attendanceRecords.filter(a => a.status === 'present').length;
    const totalLate = attendanceRecords.filter(a => a.status === 'late').length;
    const totalAbsent = attendanceRecords.filter(a => a.status === 'absent').length;

    // Department-wise breakdown
    const departmentStats = {};
    attendanceRecords.forEach(record => {
      const dept = record.user?.department || 'Unknown';
      if (!departmentStats[dept]) {
        departmentStats[dept] = { present: 0, late: 0, absent: 0 };
      }
      if (record.status === 'present') departmentStats[dept]. present++;
      else if (record.status === 'late') departmentStats[dept].late++;
      else if (record.status === 'absent') departmentStats[dept].absent++;
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];

    // Format records for frontend
    const formattedRecords = attendanceRecords.map(record => ({
      ...record.toObject(),
      employee: record.user,
      name: record.user ? `${record.user.firstName} ${record.user.lastName}` : 'N/A',
      department: record.user?.department || 'N/A',
      checkIn: record.checkIn?.time,
      checkOut: record.checkOut?.time
    }));

    res.json({
      success: true,
      data: formattedRecords
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

    const attendanceRecords = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).populate('user', 'firstName lastName employeeId department email');

    // Format data for export
    const exportData = attendanceRecords.map(record => ({
      'Employee ID': record.user?.employeeId || 'N/A',
      'First Name': record.user?.firstName || 'N/A',
      'Last Name': record.user?.lastName || 'N/A',
      'Department': record.user?.department || 'N/A',
      'Date': record.date ? new Date(record.date).toLocaleDateString() : 'N/A',
      'Check In': record.checkIn?.time ? new Date(record.checkIn.time).toLocaleString() : 'N/A',
      'Check Out': record.checkOut?.time ? new Date(record.checkOut.time).toLocaleString() : 'N/A',
      'Status': record.status,
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