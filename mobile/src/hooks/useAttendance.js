import { useAttendanceStore } from '../store/attendanceStore';

export const useAttendance = () => {
  const {
    todayAttendance,
    attendanceHistory,
    stats,
    isCheckedIn,
    isLoading,
    error,
    getTodayAttendance,
    checkIn,
    checkOut,
    getHistory,
    getStats,
    clearError,
    reset,
  } = useAttendanceStore();

  // Don't auto-fetch - let components decide when to load data
  // This prevents continuous failed API calls

  return {
    todayAttendance,
    attendanceHistory,
    stats,
    isCheckedIn,
    isLoading,
    error,
    checkIn,
    checkOut,
    getHistory,
    getStats,
    getTodayAttendance,
    clearError,
    reset,
  };
};