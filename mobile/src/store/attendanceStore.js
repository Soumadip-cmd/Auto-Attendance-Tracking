import { create } from 'zustand';
import { attendanceAPI } from '../services/api';
import locationService from '../services/locationService';
import notificationService from '../services/notificationService';

export const useAttendanceStore = create((set, get) => ({
  // State
  todayAttendance: null,
  attendanceHistory: [],
  stats: null,
  isCheckedIn: false,
  isLoading: false,
  error:  null,

  /**
   * Get today's attendance
   */
  getTodayAttendance: async () => {
    try {
      set({ isLoading: true, error: null });

      const response = await attendanceAPI.getToday();
      const attendance = response.data;

      console.log('📊 TODAY ATTENDANCE:', {
        hasCheckIn: !!attendance?.checkIn?.time,
        hasCheckOut: !!attendance?.checkOut?.time,
        checkInTime: attendance?.checkIn?.time,
        checkOutTime: attendance?.checkOut?.time,
        status: attendance?.status,
        fullData: attendance,
      });

      set({
        todayAttendance: attendance,
        isCheckedIn: attendance?.checkIn?.time && !attendance?.checkOut?.time,
        isLoading: false,
      });

      return { success: true, data: attendance };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch attendance',
      });
      return { success: false, error: error. message };
    }
  },

  /**
   * Check in
   */
  checkIn: async (notes = '') => {
    try {
      set({ isLoading: true, error: null });

      // Get current location
      const location = await locationService.getCurrentLocation();

      // Prepare check-in data
      const checkInData = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        notes,
        timestamp: new Date().toISOString(),
      };

      console.log('📍 CHECK-IN REQUEST:', checkInData);

      const response = await attendanceAPI.checkIn(checkInData);
      const attendance = response.data;

      console.log('✅ CHECK-IN SUCCESS:', attendance);

      set({
        todayAttendance: attendance,
        isCheckedIn: true,
        isLoading: false,
        error: null,
      });

      // Show success notification
      await notificationService.scheduleNotification(
        'Check-in Successful! ✅',
        `You checked in at ${new Date().toLocaleTimeString()}`,
        { type: 'check_in_success' }
      );

      return { success: true, data: attendance };
    } catch (error) {
      console.error('❌ CHECK-IN ERROR:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        fullError: error,
      });

      const errorMessage = error.response?.data?.message || error.message || 'Check-in failed';

      set({
        isLoading: false,
        error: errorMessage,
      });

      // Show error notification
      await notificationService.scheduleNotification(
        'Check-in Failed ❌',
        errorMessage,
        { type: 'check_in_error' }
      );

      return { success: false, error: errorMessage };
    }
  },

  /**
   * Check out
   */
  checkOut: async (notes = '') => {
    try {
      set({ isLoading: true, error:  null });

      // Get current location
      const location = await locationService.getCurrentLocation();

      // Prepare check-out data
      const checkOutData = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        notes,
        timestamp: new Date().toISOString(),
      };

      const response = await attendanceAPI.checkOut(checkOutData);
      const attendance = response. data;

      set({
        todayAttendance: attendance,
        isCheckedIn: false,
        isLoading: false,
        error: null,
      });

      // Show success notification
      await notificationService.scheduleNotification(
        'Check-out Successful! 🏁',
        `You checked out at ${new Date().toLocaleTimeString()}`,
        { type: 'check_out_success' }
      );

      return { success: true, data: attendance };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Check-out failed',
      });

      // Show error notification
      await notificationService.scheduleNotification(
        'Check-out Failed ❌',
        error. message || 'Please try again',
        { type: 'check_out_error' }
      );

      return { success: false, error: error.message };
    }
  },

  /**
   * Get attendance history
   */
  getHistory: async (params = {}) => {
    try {
      set({ isLoading: true, error: null });

      const response = await attendanceAPI.getHistory(params);
      const history = response.data;

      set({
        attendanceHistory: history,
        isLoading: false,
      });

      return { success: true, data:  history };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch history',
      });
      return { success: false, error: error.message };
    }
  },

  /**
   * Get attendance stats
   */
  getStats: async (params = {}) => {
    try {
      set({ isLoading: true, error: null });

      const response = await attendanceAPI.getStats(params);
      const stats = response.data;

      set({
        stats,
        isLoading: false,
      });

      return { success: true, data: stats };
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Failed to fetch stats',
      });
      return { success: false, error: error. message };
    }
  },

  /**
   * Clear error
   */
  clearError:  () => set({ error: null }),

  /**
   * Reset store
   */
  reset: () => set({
    todayAttendance:  null,
    attendanceHistory:  [],
    stats: null,
    isCheckedIn: false,
    isLoading: false,
    error: null,
  }),
}));