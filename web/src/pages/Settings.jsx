import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  User, Mail, Phone, Building, Shield, Key, 
  Bell, Globe, Save, Camera, CheckCircle 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';

const Settings = () => {
  const { setPageTitle } = useOutletContext();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    employeeId: user?.employeeId || '',
    department: user?. department || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    attendanceReminders: true,
    weeklyReports: false,
  });

  useEffect(() => {
    setPageTitle('Settings');
  }, [setPageTitle]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id:  'password', label: 'Password', icon: Key },
    { id: 'notifications', label: 'Notifications', icon:  Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      await usersAPI.update(user._id, profileData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match! ');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      alert('Password must be at least 8 characters! ');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      // Call password change API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      setSuccess(true);
      setPasswordData({
        currentPassword:  '',
        newPassword: '',
        confirmPassword: '',
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    setSuccess(false);

    try {
      // Call notification settings API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock API call
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating notifications:', error);
      alert('Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-3 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Settings updated successfully!</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab. id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ?  'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <form onSubmit={handleProfileUpdate} className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h3>
              
              {/* Profile Picture */}
              <div className="flex items-center gap-6 mb-6">
                <div className="relative">
                  <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-700 font-bold text-2xl">
                      {profileData.firstName[0]}{profileData.lastName[0]}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {profileData. firstName} {profileData.lastName}
                  </h4>
                  <p className="text-sm text-gray-500">{profileData.email}</p>
                  <p className="text-xs text-gray-400 mt-1">ID: {profileData.employeeId}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <User className="w-4 h-4 inline mr-2" />
                    First Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e. target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <User className="w-4 h-4 inline mr-2" />
                    Last Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="input bg-gray-50"
                    value={profileData.email}
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="label">
                    <Phone className="w-4 h-4 inline mr-2" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="input"
                    value={profileData. phoneNumber}
                    onChange={(e) => setProfileData({ ... profileData, phoneNumber: e. target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">
                    <Shield className="w-4 h-4 inline mr-2" />
                    Employee ID
                  </label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value={profileData.employeeId}
                    disabled
                  />
                </div>
                <div>
                  <label className="label">
                    <Building className="w-4 h-4 inline mr-2" />
                    Department
                  </label>
                  <input
                    type="text"
                    className="input bg-gray-50"
                    value={profileData.department}
                    disabled
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button type="button" className="btn-secondary" onClick={() => window.location.reload()}>
                Cancel
              </button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' :  'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card">
          <form onSubmit={handlePasswordChange} className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h3>
              <p className="text-sm text-gray-600 mb-6">
                Ensure your password is at least 8 characters and includes a mix of letters, numbers, and symbols.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="label">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordData. currentPassword}
                    onChange={(e) => setPasswordData({ ... passwordData, currentPassword: e. target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    required
                    minLength="8"
                  />
                </div>
                <div>
                  <label className="label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    required
                    minLength="8"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
                <Key className="w-4 h-4" />
                {loading ?  'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card">
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
              <p className="text-sm text-gray-600 mb-6">
                Choose how you want to receive notifications about your attendance and updates.
              </p>

              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                  { key: 'pushNotifications', label: 'Push Notifications', description: 'Receive push notifications in browser' },
                  { key:  'attendanceReminders', label: 'Attendance Reminders', description: 'Get reminded to mark attendance' },
                  { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly attendance summary' },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{setting.label}</p>
                      <p className="text-sm text-gray-500">{setting.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={notificationSettings[setting.key]}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          [setting.key]:  e.target.checked
                        })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button type="button" className="btn-secondary">
                Reset to Default
              </button>
              <button 
                onClick={handleNotificationUpdate}
                className="btn-primary flex items-center gap-2" 
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="card">
          <div className="space-y-6 max-w-xl">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Preferences</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Language</label>
                  <select className="input">
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>

                <div>
                  <label className="label">Timezone</label>
                  <select className="input">
                    <option>GMT (Greenwich Mean Time)</option>
                    <option>EST (Eastern Standard Time)</option>
                    <option>PST (Pacific Standard Time)</option>
                    <option>IST (Indian Standard Time)</option>
                  </select>
                </div>

                <div>
                  <label className="label">Date Format</label>
                  <select className="input">
                    <option>DD/MM/YYYY</option>
                    <option>MM/DD/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="label">Time Format</label>
                  <select className="input">
                    <option>12 Hour (AM/PM)</option>
                    <option>24 Hour</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card border-red-200 bg-red-50">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Danger Zone</h3>
        <p className="text-sm text-red-700 mb-4">
          Irreversible actions. Please be careful.
        </p>
        <button 
          onClick={logout}
          className="btn-secondary text-red-600 hover:bg-red-100 border-red-300"
        >
          Logout from All Devices
        </button>
      </div>
    </div>
  );
};

export default Settings;