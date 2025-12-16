import { StatsCardSkeleton, ChartSkeleton } from '../components/common/Skeleton';
import { dashboardAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, UserCheck, UserX, Clock, TrendingUp } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { setPageTitle } = useOutletContext();
  
  // State declarations
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
  });
  const [weeklyData, setWeeklyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Fetch dashboard data
  useEffect(() => {
    setPageTitle('Dashboard');
    
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all dashboard data in parallel
        const [
          statsRes,
          weeklyRes,
          deptRes,
          trendRes,
          activityRes
        ] = await Promise. all([
          dashboardAPI. getStats(),
          dashboardAPI.getWeeklyAttendance(),
          dashboardAPI.getDepartmentDistribution(),
          dashboardAPI.getMonthlyTrend(),
          dashboardAPI.getRecentActivity(),
        ]);

        // Update states with real data
        setStats(statsRes.data);
        setWeeklyData(weeklyRes.data);
        setDepartmentData(deptRes.data);
        setMonthlyTrend(trendRes.data);
        setRecentActivity(activityRes.data);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [setPageTitle]);

  // Stats cards configuration
  const statsCards = [
    {
      title: 'Total Employees',
      value:  stats.totalEmployees,
      icon: Users,
      color:  'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      change: '+5%',
      trend: 'up',
    },
    {
      title: 'Present Today',
      value: stats.presentToday,
      icon: UserCheck,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor:  'text-green-700',
      change: '+2%',
      trend: 'up',
    },
    {
      title: 'Absent Today',
      value: stats.absentToday,
      icon: UserX,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor:  'text-red-700',
      change: '-1%',
      trend: 'down',
    },
    {
      title: 'Late Today',
      value: stats.lateToday,
      icon: Clock,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      change: '0%',
      trend: 'neutral',
    },
  ];

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md: grid-cols-2 lg: grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>

        {/* Monthly Chart Skeleton */}
        <ChartSkeleton />

        {/* Quick Actions Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="card hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-green-600 dark:text-green-400' :  
                  stat.trend === 'down' ? 'text-red-600 dark:text-red-400' : 
                  'text-gray-600 dark: text-gray-400'
                }`}>
                  <TrendingUp className={`w-4 h-4 ${stat.trend === 'down' ?  'rotate-180' : ''}`} />
                  <span className="font-medium">{stat.change}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark: text-gray-400 mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Attendance Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark: text-white mb-4">Weekly Attendance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar dataKey="present" fill="#10b981" radius={[8, 8, 0, 0]} />
              <Bar dataKey="absent" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark: text-white mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={departmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || `hsl(${index * 45}, 70%, 50%)`} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Attendance Trend */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Attendance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlyTrend}>
            <defs>
              <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
            />
            <Area 
              type="monotone" 
              dataKey="attendance" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorAttendance)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Welcome Message */}
      <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard!  👋</h2>
            <p className="text-primary-100">
              Manage employees, track attendance, and generate reports all in one place. 
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full btn-secondary justify-start">
              👥 Add New Employee
            </button>
            <button className="w-full btn-secondary justify-start">
              📋 Mark Attendance
            </button>
            <button className="w-full btn-secondary justify-start">
              📊 Generate Report
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === 'present' ? 'bg-green-500' : 
                    activity.status === 'late' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.employeeName} {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.timeAgo}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark: text-gray-400">No recent activity</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;