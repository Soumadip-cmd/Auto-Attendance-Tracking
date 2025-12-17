import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../services/api';

const WorkSchedule = () => {
  const [schedule, setSchedule] = useState({
    workDays: {
      monday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
      tuesday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
      wednesday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
      thursday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
      friday: { enabled: true, startTime: '09:00', endTime: '18:00', breakDuration: 60 },
      saturday: { enabled: false, startTime: '09:00', endTime: '14:00', breakDuration: 0 },
      sunday: { enabled: false, startTime: '09:00', endTime: '14:00', breakDuration: 0 },
    },
    lateGracePeriod: 15,
    earlyCheckoutGracePeriod: 15,
    minimumWorkHours: 8,
    overtimeThreshold: 9,
    halfDayThreshold: 4,
    autoCheckout: false,
    autoCheckoutTime: '18:30',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings/work-schedule');
      if (response.data.success && response.data.data) {
        setSchedule(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
      // Use default schedule if none exists
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day) => {
    setSchedule(prev => ({
      ...prev,
      workDays: {
        ...prev.workDays,
        [day]: {
          ...prev.workDays[day],
          enabled: !prev.workDays[day].enabled,
        },
      },
    }));
  };

  const handleDayTimeChange = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      workDays: {
        ...prev.workDays,
        [day]: {
          ...prev.workDays[day],
          [field]: value,
        },
      },
    }));
  };

  const handleGlobalChange = (field, value) => {
    setSchedule(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.post('/settings/work-schedule', schedule);
      if (response.data.success) {
        toast.success('Work schedule saved successfully!');
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to save work schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = () => {
    const mondaySchedule = schedule.workDays.monday;
    const updatedDays = {};
    
    daysOfWeek.forEach(day => {
      if (schedule.workDays[day].enabled) {
        updatedDays[day] = {
          ...schedule.workDays[day],
          startTime: mondaySchedule.startTime,
          endTime: mondaySchedule.endTime,
          breakDuration: mondaySchedule.breakDuration,
        };
      } else {
        updatedDays[day] = schedule.workDays[day];
      }
    });

    setSchedule(prev => ({
      ...prev,
      workDays: updatedDays,
    }));
    
    toast.success('Monday schedule applied to all enabled days');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Work Schedule Configuration</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure working hours, breaks, and attendance policies
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Weekly Schedule */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Schedule</h2>
          <button
            onClick={handleApplyToAll}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Apply Monday to All Days
          </button>
        </div>

        <div className="space-y-4">
          {daysOfWeek.map(day => (
            <div key={day} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center min-w-[140px]">
                <input
                  type="checkbox"
                  id={`enable-${day}`}
                  checked={schedule.workDays[day].enabled}
                  onChange={() => handleDayToggle(day)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor={`enable-${day}`} className="ml-2 text-sm font-medium capitalize text-gray-900 dark:text-white">
                  {day}
                </label>
              </div>

              {schedule.workDays[day].enabled && (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Start:</label>
                    <input
                      type="time"
                      value={schedule.workDays[day].startTime}
                      onChange={(e) => handleDayTimeChange(day, 'startTime', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">End:</label>
                    <input
                      type="time"
                      value={schedule.workDays[day].endTime}
                      onChange={(e) => handleDayTimeChange(day, 'endTime', e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Break (min):</label>
                    <input
                      type="number"
                      value={schedule.workDays[day].breakDuration}
                      onChange={(e) => handleDayTimeChange(day, 'breakDuration', parseInt(e.target.value) || 0)}
                      min="0"
                      max="180"
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
                    {(() => {
                      const start = schedule.workDays[day].startTime.split(':');
                      const end = schedule.workDays[day].endTime.split(':');
                      const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
                      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
                      const workMinutes = endMinutes - startMinutes - schedule.workDays[day].breakDuration;
                      const hours = Math.floor(workMinutes / 60);
                      const minutes = workMinutes % 60;
                      return `${hours}h ${minutes}m`;
                    })()}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Attendance Policies */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Attendance Policies</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Late Grace Period (minutes)
            </label>
            <input
              type="number"
              value={schedule.lateGracePeriod}
              onChange={(e) => handleGlobalChange('lateGracePeriod', parseInt(e.target.value) || 0)}
              min="0"
              max="60"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Employee can check in late within this period without penalty
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Early Checkout Grace Period (minutes)
            </label>
            <input
              type="number"
              value={schedule.earlyCheckoutGracePeriod}
              onChange={(e) => handleGlobalChange('earlyCheckoutGracePeriod', parseInt(e.target.value) || 0)}
              min="0"
              max="60"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Employee can check out early within this period without penalty
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Work Hours
            </label>
            <input
              type="number"
              value={schedule.minimumWorkHours}
              onChange={(e) => handleGlobalChange('minimumWorkHours', parseFloat(e.target.value) || 0)}
              min="0"
              max="24"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Required minimum hours for a full day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Half-Day Threshold (hours)
            </label>
            <input
              type="number"
              value={schedule.halfDayThreshold}
              onChange={(e) => handleGlobalChange('halfDayThreshold', parseFloat(e.target.value) || 0)}
              min="0"
              max="12"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Hours below this count as half-day
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Overtime Threshold (hours)
            </label>
            <input
              type="number"
              value={schedule.overtimeThreshold}
              onChange={(e) => handleGlobalChange('overtimeThreshold', parseFloat(e.target.value) || 0)}
              min="0"
              max="24"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Hours above this count as overtime
            </p>
          </div>
        </div>
      </div>

      {/* Auto Checkout */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Auto Checkout</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto-checkout"
              checked={schedule.autoCheckout}
              onChange={(e) => handleGlobalChange('autoCheckout', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <label htmlFor="auto-checkout" className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
              Enable automatic checkout
            </label>
          </div>

          {schedule.autoCheckout && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto Checkout Time
              </label>
              <input
                type="time"
                value={schedule.autoCheckoutTime}
                onChange={(e) => handleGlobalChange('autoCheckoutTime', e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Automatically check out employees who forgot to check out
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button Bottom */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Saving Changes...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
};

export default WorkSchedule;
