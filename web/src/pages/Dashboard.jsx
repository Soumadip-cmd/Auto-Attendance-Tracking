import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Calendar,
  Activity,
} from 'lucide-react';
import { StatsCardSkeleton, ChartSkeleton } from '../components/common/Skeleton';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Dashboard = () => {
  const { setPageTitle } = useOutletContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
  });
  const [departmentData, setDepartmentData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    setPageTitle('Dashboard');
    fetchDashboardData();
  }, [setPageTitle]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, weeklyRes, deptRes, monthlyRes, activityRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI. getWeeklyAttendance(),
        dashboardAPI.getDepartmentDistribution(),
        dashboardAPI. getMonthlyTrend(),
        dashboardAPI.getRecentActivity(),
      ]);

      // Set stats with fallback values
      setStats({
        totalEmployees: statsRes. data?.data?.totalEmployees || 0,
        presentToday: statsRes.data?.data?.presentToday || 0,
        absentToday: statsRes.data?. data?.absentToday || 0,
        lateToday: statsRes.data?.data?. lateToday || 0,
      });

      // Set chart data with array validation
      setDepartmentData(
        Array.isArray(deptRes.data?.data) ? deptRes.data.data : []
      );
      setWeeklyData(
        Array.isArray(weeklyRes.data?. data) ? weeklyRes.data.data : []
      );
      setMonthlyData(
        Array.isArray(monthlyRes.data?.data) ? monthlyRes.data.data : []
      );
      setRecentActivity(
        Array.isArray(activityRes.data?.data) ? activityRes.data. data : []
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
      
      // Set empty arrays on error
      setDepartmentData([]);
      setWeeklyData([]);
      setMonthlyData([]);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="card hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-700 dark:text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 dark: text-gray-400 mb-1">
            Total Employees
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats.totalEmployees}
          </p>
        </div>

        {/* Present Today */}
        <div className="card hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-700 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Present Today
          </p>
          <p className="text-3xl font-bold text-green-600">
            {stats.presentToday}
          </p>
        </div>

        {/* Absent Today */}
        <div className="card hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
              <XCircle className="w-6 h-6 text-red-700 dark:text-red-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark: text-gray-400 mb-1">
            Absent Today
          </p>
          <p className="text-3xl font-bold text-red-600">
            {stats.absentToday}
          </p>
        </div>

        {/* Late Today */}
        <div className="card hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-700 dark:text-yellow-400" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Late Today
          </p>
          <p className="text-3xl font-bold text-yellow-600">
            {stats. lateToday}
          </p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Weekly Attendance
            </h3>
          </div>
          <div className="h-80">
            {Array.isArray(weeklyData) && weeklyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-gray-700" />
                  <XAxis
                    dataKey="day"
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis className="text-gray-600 dark:text-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="present" fill="#10B981" name="Present" />
                  <Bar dataKey="absent" fill="#EF4444" name="Absent" />
                  <Bar dataKey="late" fill="#F59E0B" name="Late" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No weekly data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Department Distribution */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Department Distribution
            </h3>
          </div>
          <div className="h-80">
            {Array.isArray(departmentData) && departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor={x > cx ? 'start' : 'end'}
                          dominantBaseline="central"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    outerRadius={100}
                    dataKey="value"
                  >
                    {departmentData. map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS. length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No department data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-gray-900 dark: text-white">
              Monthly Attendance Trend
            </h3>
          </div>
          <div className="h-80">
            {Array.isArray(monthlyData) && monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="dark: stroke-gray-700" />
                  <XAxis
                    dataKey="date"
                    className="text-gray-600 dark:text-gray-400"
                  />
                  <YAxis className="text-gray-600 dark: text-gray-400" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorPresent)"
                    name="Present"
                  />
                  <Area
                    type="monotone"
                    dataKey="absent"
                    stroke="#EF4444"
                    fillOpacity={1}
                    fill="url(#colorAbsent)"
                    name="Absent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark: text-gray-400">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No monthly data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
          </div>
          <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
            {Array.isArray(recentActivity) && recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div
                    className={`p-2 rounded-lg ${
                      activity.action?.includes('checked in')
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : activity.action?.includes('checked out')
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}
                  >
                    {activity.action?.includes('checked in') ? (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    ) : activity.action?.includes('checked out') ? (
                      <XCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.employeeName}
                      </p>
                      {activity.status === 'late' && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Late
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {activity.timeAgo || 'Just now'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="btn-primary flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Mark Attendance
          </button>
          <button className="btn-secondary flex items-center justify-center gap-2">
            <Users className="w-4 h-4" />
            Add Employee
          </button>
          <button className="btn-secondary flex items-center justify-center gap-2">
            <Activity className="w-4 h-4" />
            View Reports
          </button>
          <button className="btn-secondary flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;