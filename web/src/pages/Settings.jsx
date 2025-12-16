import ImageUpload from '../components/common/ImageUpload';
import { FormSkeleton } from '../components/common/Skeleton';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  User, Lock, Bell, Globe, Mail, Phone, 
  Building, Save, X 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const { setPageTitle } = useOutletContext();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPageTitle('Settings');
  }, [setPageTitle]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id:  'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="card">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="card">
        {activeTab === 'profile' && <ProfileTab user={user} loading={loading} setLoading={setLoading} />}
        {activeTab === 'password' && <PasswordTab loading={loading} setLoading={setLoading} />}
        {activeTab === 'notifications' && <NotificationsTab loading={loading} setLoading={setLoading} />}
        {activeTab === 'preferences' && <PreferencesTab loading={loading} setLoading={setLoading} />}
      </div>
    </div>
  );
};

const ProfileTab = ({ user, loading, setLoading }) => {
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?. email || '',
    phoneNumber: user?.phoneNumber || '',
    employeeId: user?.employeeId || '',
    department: user?.department || '',
  });
  const [profilePicture, setProfilePicture] = useState(null);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // If there's a new profile picture, upload it first
      if (profilePicture) {
        const formData = new FormData();
        formData.append('profilePicture', profilePicture);
        // await usersAPI.uploadProfilePicture(user._id, formData);
      }

      // Update profile data
      await usersAPI.update(user._id, profileData);
      toast.success('Profile updated successfully!  ✅');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile ❌');
    } finally {
      setLoading(false);
    }
  };

  // ... rest of the component
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Profile Information</h3>

{/* Profile Picture Upload */}
<div className="mb-8">
  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Picture</h4>
  <ImageUpload
  currentImage={profilePicture}
  onImageChange={(file) => setProfilePicture(file)}
  userName={`${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`}
/>
</div>

{/* User Info */}
<div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
    {user?.firstName} {user?.lastName}
  </h4>
  <p className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</p>
  <p className="text-xs text-gray-500 dark: text-gray-500 mt-1">
    ID: {user?.employeeId || 'N/A'}
  </p>
</div>

      {/* Profile Form */}
      <form onSubmit={handleProfileUpdate} className="space-y-4">
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
              onChange={(e) => setProfileData({ ...profileData, lastName: e.target. value })}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">
            <Mail className="w-4 h-4 inline mr-2" />
            Email Address
          </label>
          <input
            type="email"
            className="input"
            value={profileData.email}
            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            <input
              type="tel"
              className="input"
              value={profileData.phoneNumber}
              onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="label">
              <Building className="w-4 h-4 inline mr-2" />
              Department
            </label>
            <input
              type="text"
              className="input"
              value={profileData.department}
              onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Employee ID</label>
          <input
            type="text"
            className="input bg-gray-50 dark:bg-gray-900"
            value={profileData.employeeId}
            disabled
          />
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Employee ID cannot be changed</p>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            className="btn-secondary flex-1"
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// Password Tab Component
const PasswordTab = ({ loading, setLoading }) => {
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword:  '',
  });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match!  ⚠️');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters!  ⚠️');
      return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password changed successfully! 🔐');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password ❌');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Change Password</h3>
      
      <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
        <div>
          <label className="label">Current Password</label>
          <input
            type="password"
            className="input"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
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
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Must be at least 8 characters long
          </p>
        </div>

        <div>
          <label className="label">Confirm New Password</label>
          <input
            type="password"
            className="input"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData({ ... passwordData, confirmPassword: e. target.value })}
            required
            minLength="8"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={() => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ?  'Changing...' : 'Change Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

// Notifications Tab Component
const NotificationsTab = ({ loading, setLoading }) => {
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: false,
    attendanceAlerts: true,
    weeklyReports: true,
    systemUpdates: false,
  });

  const handleNotificationUpdate = async () => {
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Notification settings saved! 🔔');
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast.error('Failed to update settings ❌');
    } finally {
      setLoading(false);
    }
  };

  const NotificationToggle = ({ id, label, description }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="flex-1">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={notifications[id]}
          onChange={(e) => setNotifications({ ...notifications, [id]: e.target.checked })}
        />
        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer peer-checked:after:translate-x-full peer-checked: after:border-white after:content-[''] after:absolute after: top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after: w-5 after:transition-all peer-checked:bg-primary-600"></div>
      </label>
    </div>
  );

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Notifications</h3>
      
      <div className="space-y-1">
        <NotificationToggle
          id="emailNotifications"
          label="Email Notifications"
          description="Receive email updates about your attendance"
        />
        <NotificationToggle
          id="pushNotifications"
          label="Push Notifications"
          description="Receive push notifications on your device"
        />
        <NotificationToggle
          id="attendanceAlerts"
          label="Attendance Alerts"
          description="Get notified about attendance anomalies"
        />
        <NotificationToggle
          id="weeklyReports"
          label="Weekly Reports"
          description="Receive weekly attendance summary reports"
        />
        <NotificationToggle
          id="systemUpdates"
          label="System Updates"
          description="Get notified about system updates and maintenance"
        />
      </div>

      <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
        <button
          onClick={handleNotificationUpdate}
          className="btn-primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};

// Preferences Tab Component
const PreferencesTab = ({ loading, setLoading }) => {
  const [preferences, setPreferences] = useState({
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
  });

  const handlePreferencesUpdate = async () => {
    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Preferences saved! ⚙️');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences ❌');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Preferences</h3>
      
      <div className="space-y-4 max-w-md">
        <div>
          <label className="label">Language</label>
          <select
            className="input"
            value={preferences.language}
            onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        <div>
          <label className="label">Timezone</label>
          <select
            className="input"
            value={preferences.timezone}
            onChange={(e) => setPreferences({ ... preferences, timezone: e.target. value })}
          >
            <option value="UTC">UTC</option>
            <option value="EST">Eastern Time (EST)</option>
            <option value="PST">Pacific Time (PST)</option>
            <option value="GMT">Greenwich Mean Time (GMT)</option>
          </select>
        </div>

        <div>
          <label className="label">Date Format</label>
          <select
            className="input"
            value={preferences. dateFormat}
            onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target. value })}
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>

        <div>
          <label className="label">Time Format</label>
          <select
            className="input"
            value={preferences.timeFormat}
            onChange={(e) => setPreferences({ ... preferences, timeFormat: e.target.value })}
          >
            <option value="12h">12-hour</option>
            <option value="24h">24-hour</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handlePreferencesUpdate}
            className="btn-primary flex-1"
            disabled={loading}
          >
            {loading ? 'Saving...' :  'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;