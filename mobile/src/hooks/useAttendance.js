import { useEffect } from 'react';
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

  // Fetch today's attendance on mount
  useEffect(() => {
    getTodayAttendance();
  }, []);

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