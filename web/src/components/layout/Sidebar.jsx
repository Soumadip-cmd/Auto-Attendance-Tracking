import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  BarChart3,
  Clock,
  Settings,
  LogOut,
  MapPin,
  Navigation,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isPathAllowedForRole } from '../../utils/roleAccess';
import { liveTrackingAPI } from '../../services/api';

const VIOLATION_POLL_MS = 20000;

const Sidebar = () => {
  const { logout, user } = useAuth();
  const [violationCount, setViolationCount] = useState(0);

  // Polls rather than relying on LiveTracking.jsx's own socket, so the count
  // stays visible/accurate from every page, not just while Live Tracking is
  // open (that page has its own separate real-time socket for the map).
  useEffect(() => {
    let cancelled = false;

    const fetchViolationCount = async () => {
      try {
        const response = await liveTrackingAPI.getLive({ activeWithinMinutes: 180 });
        if (!cancelled && response.data.success) {
          const count = response.data.data.filter((location) => location.violation).length;
          setViolationCount(count);
        }
      } catch (error) {
        // Non-fatal — badge just stays at its last known value.
      }
    };

    fetchViolationCount();
    const interval = setInterval(fetchViolationCount, VIOLATION_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Users, label: 'Employees', path: '/employees' },
    { icon: Building2, label: 'Departments', path: '/departments' },
    { icon: ClipboardList, label: 'Attendance', path: '/attendance' },
    { icon: Navigation, label: 'Live Tracking', path: '/live-tracking' },
    { icon: ShieldCheck, label: 'Permissions', path: '/movement-permissions' },
    { icon: MapPin, label: 'Geofences', path: '/geofences' },
    { icon: BarChart3, label: 'Reports', path: '/reports' },
    { icon: Clock, label: 'Work Schedule', path: '/work-schedule' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ].filter((item) => isPathAllowedForRole(user?.role, item.path));

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-screen fixed left-0 top-0 transition-colors">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-primary-600 dark:text-primary-400">
          {import.meta. env.VITE_APP_NAME || 'Admin Panel'}
        </h1>
        <p className="text-xs text-gray-500 dark: text-gray-400 mt-1">Attendance Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item. path}
              to={item. path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark: bg-primary-900/20 text-primary-700 dark: text-primary-400 font-medium'
                    : 'text-gray-700 dark: text-gray-300 hover: bg-gray-50 dark: hover:bg-gray-700'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1">{item.label}</span>
              {item.path === '/live-tracking' && violationCount > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-red-600 text-white text-xs font-semibold">
                  {violationCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <span className="text-primary-700 dark:text-primary-400 font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
