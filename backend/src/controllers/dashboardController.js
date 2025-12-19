const User = require('../models/User');
const Attendance = require('../models/Attendance');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total employees
    const totalEmployees = await User.countDocuments({ role: { $ne: 'admin' } });

    // Today's attendance
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    }).populate('user', 'firstName lastName employeeId');

    const presentToday = todayAttendance.filter(a => a.status === 'present').length;
    const lateToday = todayAttendance.filter(a => a.status === 'late').length;
    const checkedInToday = todayAttendance.filter(a => a.checkIn?.time).length;
    const absentToday = totalEmployees - checkedInToday;

    // Calculate percentages
    const presentPercentage = totalEmployees > 0 
      ? ((presentToday / totalEmployees) * 100).toFixed(1) 
      : 0;

    const latePercentage = totalEmployees > 0 
      ? ((lateToday / totalEmployees) * 100).toFixed(1) 
      : 0;

    const absentPercentage = totalEmployees > 0 
      ? ((absentToday / totalEmployees) * 100).toFixed(1) 
      : 0;
    
    const attendanceRate = totalEmployees > 0 
      ? (((presentToday + lateToday) / totalEmployees) * 100).toFixed(1) 
      : 0;

    res.json({
      success: true,
      data: {
        totalEmployees,
        presentToday,
        lateToday,
        absentToday,
        checkedInToday,
        presentPercentage,
        latePercentage,
        absentPercentage,
        attendanceRate
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get weekly attendance data for chart
exports.getWeeklyAttendance = async (req, res) => {
  try {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6); // Last 7 days
    weekAgo.setHours(0, 0, 0, 0);

    const weeklyData = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(weekAgo);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayAttendance = await Attendance.find({
        date: { $gte: dayStart, $lt: dayEnd }
      });

      const present = dayAttendance.filter(a => a.status === 'present').length;
      const late = dayAttendance.filter(a => a.status === 'late').length;
      const absent = dayAttendance.filter(a => a.status === 'absent').length;

      weeklyData.push({
        day: days[dayStart.getDay()],
        present,
        late,
        absent,
        date: dayStart.toISOString().split('T')[0]
      });
    }

    res.json({
      success: true,
      data: weeklyData
    });
  } catch (error) {
    console.error('Weekly attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly attendance',
      error: error.message
    });
  }
};

// Get department distribution for pie chart
exports.getDepartmentDistribution = async (req, res) => {
  try {
    const departments = await User.aggregate([
      { $match: { role: { $ne:  'admin' } } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $project: { department: '$_id', count: 1, _id: 0 } }
    ]);

    // Calculate percentages
    const total = departments.reduce((sum, dept) => sum + dept.count, 0);
    const distributionData = departments.map(dept => ({
      name: dept.department,
      value: dept.count,
      percentage: total > 0 ? ((dept.count / total) * 100).toFixed(1) : 0
    }));

    res.json({
      success: true,
      data: distributionData
    });
  } catch (error) {
    console.error('Department distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching department distribution',
      error:  error.message
    });
  }
};

// Get monthly attendance trend for line chart
exports.getMonthlyTrend = async (req, res) => {
  try {
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo. setHours(0, 0, 0, 0);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendData = [];

    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(sixMonthsAgo);
      monthStart.setMonth(monthStart.getMonth() + i);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthAttendance = await Attendance.find({
        checkIn: { $gte: monthStart, $lt: monthEnd }
      });

      const totalDays = monthAttendance.length;
      const presentDays = monthAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
      const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

      trendData.push({
        month: months[monthStart.getMonth()],
        attendance: parseFloat(attendanceRate),
        year: monthStart.getFullYear()
      });
    }

    res.json({
      success: true,
      data: trendData
    });
  } catch (error) {
    console.error('Monthly trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly trend',
      error: error.message
    });
  }
};

// Get recent activity
exports.getRecentActivity = async (req, res) => {
  try {
    const recentAttendance = await Attendance.find()
      .populate('user', 'firstName lastName employeeId')
      .sort({ 'checkIn.time': -1 })
      .limit(10);

    const activities = recentAttendance
      .filter(attendance => attendance.user) // Filter out records with null users
      .map(attendance => {
        const checkInTime = attendance.checkIn?.time || attendance.checkIn;
        const timeDiff = Date.now() - new Date(checkInTime).getTime();
        const minutes = Math.floor(timeDiff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        let timeAgo;
        if (days > 0) timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
        else if (hours > 0) timeAgo = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        else if (minutes > 0) timeAgo = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        else timeAgo = 'Just now';

        return {
          id: attendance._id,
          employeeName: `${attendance.user.firstName} ${attendance.user.lastName}`,
          employeeId: attendance.user.employeeId,
          action: attendance.checkOut?.time ? 'checked out' : 'checked in',
          timeAgo,
          status: attendance.status,
          timestamp: checkInTime
        };
      });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activity',
      error: error.message
    });
  }
};