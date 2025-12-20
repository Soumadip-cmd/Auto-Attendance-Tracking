import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { settingsAPI, authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  Building2,
  Clock,
  Bell,
  Globe,
  Calendar,
  User,
  Lock,
  Moon,
  Sun,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';

const Settings = () => {
  const { setPageTitle } = useOutletContext();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile Settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });

  // Password Change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Company Settings
  const [companySettings, setCompanySettings] = useState({
    companyName: 'Your Company Name',
    companyAddress: '',
    companyPhone: '',
    companyEmail:  '',
  });

  // Work Schedule
  const [workSchedule, setWorkSchedule] = useState({
    workStartTime: '09:00',
    workEndTime: '17:00',
    breakStartTime:  '12:00',
    breakEndTime: '13:00',
    lateThreshold: 15,
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    checkInAlerts: true,
    checkOutAlerts: true,
    lateArrivalAlerts: true,
  });

  // Holidays
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date:  '',
  });

  useEffect(() => {
    setPageTitle('Settings');
    loadUserProfile();
  }, [setPageTitle]);

  const loadUserProfile = async () => {
    try {
      const response = await authAPI.getMe();
      const userData = response.data. data;
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData. email || '',
        phoneNumber:  userData.phoneNumber || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.updateProfile(user._id, profileData);
      toast.success('Profile updated successfully!  ');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await authAPI.updatePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData. newPassword,
      });
      toast.success('Password changed successfully!  ');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' :  'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document. documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(`Switched to ${newTheme} mode`);
  };

  const handleAddHoliday = () => {
    if (! newHoliday.name || !newHoliday.date) {
      toast.error('Please enter holiday name and date');
      return;
    }

    setHolidays([...holidays, { ...newHoliday, id: Date.now() }]);
    setNewHoliday({ name: '', date: '' });
    toast.success('Holiday added successfully!  ');
  };

  const handleDeleteHoliday = (id) => {
    setHolidays(holidays.filter(h => h.id !== id));
    toast.success('Holiday removed');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id:  'company', label: 'Company', icon: Building2 },
    { id: 'schedule', label:  'Work Schedule', icon: Clock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'holidays', label:  'Holidays', icon: Calendar },
    { id: 'appearance', label: 'Appearance', icon: theme === 'dark' ? Moon : Sun },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 text-gray-400">
            Settings
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your account and application settings
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="card overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark: text-white mb-6">
            Profile Information
          </h3>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input
                  type="text"
                  className="input"
                  value={profileData. firstName}
                  onChange={(e) =>
                    setProfileData({ ... profileData, firstName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  className="input"
                  value={profileData.lastName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, lastName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={profileData.email}
                  disabled
                />
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  className="input"
                  value={profileData.phoneNumber}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phoneNumber: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Change Password
          </h3>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="input pr-12"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, currentPassword: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className="input pr-12"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Must be at least 8 characters
              </p>
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="input pr-12"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors p-1"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={loading}>
                <Lock className="w-4 h-4 mr-2" />
                {loading ? 'Changing.. .' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Company Tab */}
      {activeTab === 'company' && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark: text-white mb-6">
            Company Information
          </h3>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Company Name</label>
                <input
                  type="text"
                  className="input"
                  value={companySettings.companyName}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, companyName: e. target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Company Phone</label>
                <input
                  type="tel"
                  className="input"
                  value={companySettings.companyPhone}
                  onChange={(e) =>
                    setCompanySettings({ ...companySettings, companyPhone: e.target.value })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Company Address</label>
                <textarea
                  className="input"
                  rows={3}
                  value={companySettings.companyAddress}
                  onChange={(e) =>
                    setCompanySettings({ ... companySettings, companyAddress:  e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Company Email</label>
                <input
                  type="email"
                  className="input"
                  value={companySettings.companyEmail}
                  onChange={(e) =>
                    setCompanySettings({ ... companySettings, companyEmail:  e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn-primary">
                <Save className="w-4 h-4 mr-2" />
                Save Company Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Work Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Work Schedule Configuration
          </h3>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Work Start Time</label>
                <input
                  type="time"
                  className="input"
                  value={workSchedule.workStartTime}
                  onChange={(e) =>
                    setWorkSchedule({ ...workSchedule, workStartTime: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Work End Time</label>
                <input
                  type="time"
                  className="input"
                  value={workSchedule.workEndTime}
                  onChange={(e) =>
                    setWorkSchedule({ ...workSchedule, workEndTime: e.target. value })
                  }
                />
              </div>
              <div>
                <label className="label">Break Start Time</label>
                <input
                  type="time"
                  className="input"
                  value={workSchedule.breakStartTime}
                  onChange={(e) =>
                    setWorkSchedule({ ...workSchedule, breakStartTime: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Break End Time</label>
                <input
                  type="time"
                  className="input"
                  value={workSchedule.breakEndTime}
                  onChange={(e) =>
                    setWorkSchedule({ ...workSchedule, breakEndTime: e. target.value })
                  }
                />
              </div>
              <div>
                <label className="label">Late Threshold (minutes)</label>
                <input
                  type="number"
                  className="input"
                  value={workSchedule.lateThreshold}
                  onChange={(e) =>
                    setWorkSchedule({ ...workSchedule, lateThreshold: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn-primary">
                <Save className="w-4 h-4 mr-2" />
                Save Schedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Notification Preferences
          </h3>
          <div className="space-y-4">
            {Object.entries(notificationSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str. toUpperCase())}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive notifications for this event
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={value}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        [key]: e. target.checked,
                      })
                    }
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked: after:border-white after:content-[''] after:absolute after: top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after: w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <button className="btn-primary">
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Holiday Management
          </h3>
          
          {/* Add Holiday Form */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add New Holiday</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Holiday Name"
                className="input"
                value={newHoliday.name}
                onChange={(e) => setNewHoliday({ ... newHoliday, name:  e.target.value })}
              />
              <input
                type="date"
                className="input"
                value={newHoliday.date}
                onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
              />
              <button onClick={handleAddHoliday} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Holiday
              </button>
            </div>
          </div>

          {/* Holidays List */}
          <div className="space-y-2">
            {holidays.length === 0 ? (
              <p className="text-center text-gray-500 dark: text-gray-400 py-8">
                No holidays added yet
              </p>
            ) : (
              holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark: text-white">
                      {holiday.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(holiday.date).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteHoliday(holiday. id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
            Appearance Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Dark Mode
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Toggle between light and dark theme
                </p>
              </div>
              <button
                onClick={handleThemeToggle}
                className="p-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;