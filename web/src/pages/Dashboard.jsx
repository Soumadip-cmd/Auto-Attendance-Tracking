import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, UserCheck, UserX, Clock } from 'lucide-react';
import { attendanceAPI, usersAPI } from '../services/api';

const Dashboard = () => {
  const { setPageTitle } = useOutletContext();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    lateToday: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageTitle('Dashboard');
    fetchDashboardData();
  }, [setPageTitle]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API calls when backend is ready
      setStats({
        totalEmployees:  50,
        presentToday: 42,
        absentToday:  5,
        lateToday:  3,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
    },
    {
      title:  'Present Today',
      value: stats.presentToday,
      icon: UserCheck,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    {
      title: 'Absent Today',
      value:  stats.absentToday,
      icon: UserX,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
    {
      title: 'Late Today',
      value: stats.lateToday,
      icon: Clock,
      color:  'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
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
            <div key={stat.title} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-4 rounded-lg`}>
                  <Icon className={`w-8 h-8 ${stat. textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Welcome Message */}
      <div className="card bg-gradient-to-r from-primary-500 to-primary-600 text-white">
        <h3 className="text-2xl font-bold mb-2">Welcome to Admin Dashboard!  👋</h3>
        <p className="text-primary-100">
          Manage employees, track attendance, and generate reports all in one place.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <h4 className="font-semibold text-gray-900 mb-2">Quick Actions</h4>
          <p className="text-sm text-gray-600">Manage your system efficiently</p>
        </div>
        <div className="card hover:shadow-md transition-shadow cursor-pointer">
          <h4 className="font-semibold text-gray-900 mb-2">Recent Activity</h4>
          <p className="text-sm text-gray-600">View latest updates</p>
        </div>
        <div className="card hover: shadow-md transition-shadow cursor-pointer">
          <h4 className="font-semibold text-gray-900 mb-2">Analytics</h4>
          <p className="text-sm text-gray-600">Track performance metrics</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;