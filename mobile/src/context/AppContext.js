 import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authAPI, attendanceAPI, locationAPI } from '../services/api';
import { secureStorage } from '../utils/storage';
import { APP_CONFIG } from '../constants/config';
import websocketService from '../services/websocket';
import locationService from '../services/locationService';
import * as Location from 'expo-location';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Auth State
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Attendance State
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  // Location State
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);

  // General State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ============= AUTH FUNCTIONS =============
  const initAuth = useCallback(async () => {
    try {
      setAuthLoading(true);
      const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
      const userJson = await secureStorage.getItem(APP_CONFIG.USER_KEY);

      if (token && userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
        setIsAuthenticated(true);

        // Initialize services
        await websocketService.connect();
        await getTodayAttendance();
        
        return true;
      }
      return false;
    } catch (err) {
      console.error('Init auth error:', err);
      return false;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setAuthLoading(true);
      setError(null);

      const response = await authAPI.login(credentials);
      const { user: userData, token, refreshToken } = response.data;

      await secureStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
      await secureStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
      await secureStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      // Initialize services
      await websocketService.connect();
      await getTodayAttendance();

      return { success: true, user: userData };
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setAuthLoading(true);
      setError(null);

      const response = await authAPI.register(userData);
      const { user: newUser, token, refreshToken } = response.data;

      await secureStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
      await secureStorage.setItem(APP_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
      await secureStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(newUser));

      setUser(newUser);
      setIsAuthenticated(true);

      return { success: true, user: newUser };
    } catch (err) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await authAPI.logout();
      
      // Clear all storage including biometric credentials
      await secureStorage.removeItem(APP_CONFIG.TOKEN_KEY);
      await secureStorage.removeItem(APP_CONFIG.REFRESH_TOKEN_KEY);
      await secureStorage.removeItem(APP_CONFIG.USER_KEY);
      
      // Clear AsyncStorage biometric data
      await AsyncStorage.removeItem('biometric_email');
      await AsyncStorage.removeItem('biometric_password');
      await AsyncStorage.removeItem('biometric_enabled');

      websocketService.disconnect();
      locationService.stopTracking();

      // Clear state immediately
      setUser(null);
      setIsAuthenticated(false);
      setTodayAttendance(null);
      setAttendanceHistory([]);
      setIsCheckedIn(false);

      console.log('✅ Logout successful, state cleared, navigation will trigger');
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      // Even if logout API fails, clear local data
      await secureStorage.removeItem(APP_CONFIG.TOKEN_KEY);
      await secureStorage.removeItem(APP_CONFIG.REFRESH_TOKEN_KEY);
      await secureStorage.removeItem(APP_CONFIG.USER_KEY);
      await AsyncStorage.removeItem('biometric_email');
      await AsyncStorage.removeItem('biometric_password');
      await AsyncStorage.removeItem('biometric_enabled');
      
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data) => {
    try {
      setLoading(true);
      const response = await authAPI.updateProfile(data);
      const updatedUser = response.data.user;

      await secureStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true, user: updatedUser };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ============= ATTENDANCE FUNCTIONS =============
  const getTodayAttendance = useCallback(async () => {
    try {
      const response = await attendanceAPI.getToday();
      const attendance = response.data;
      
      setTodayAttendance(attendance);
      setIsCheckedIn(attendance?.status === 'checked-in');
      
      return attendance;
    } catch (err) {
      console.error('Get today attendance error:', err);
      return null;
    }
  }, []);

  const checkIn = useCallback(async (locationData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceAPI.checkIn({
        location: locationData || currentLocation,
      });

      const attendance = response.data;
      setTodayAttendance(attendance);
      setIsCheckedIn(true);

      return { success: true, attendance };
    } catch (err) {
      const errorMsg = err.message || 'Check-in failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [currentLocation]);

  const checkOut = useCallback(async (locationData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await attendanceAPI.checkOut({
        location: locationData || currentLocation,
      });

      const attendance = response.data;
      setTodayAttendance(attendance);
      setIsCheckedIn(false);

      return { success: true, attendance };
    } catch (err) {
      const errorMsg = err.message || 'Check-out failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [currentLocation]);

  const getAttendanceHistory = useCallback(async (params) => {
    try {
      setLoading(true);
      const response = await attendanceAPI.getHistory(params);
      const history = response.data;
      
      setAttendanceHistory(history);
      return history;
    } catch (err) {
      console.error('Get attendance history error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getAttendanceStats = useCallback(async (params) => {
    try {
      const response = await attendanceAPI.getStats(params);
      const stats = response.data;
      
      setAttendanceStats(stats);
      return stats;
    } catch (err) {
      console.error('Get attendance stats error:', err);
      return null;
    }
  }, []);

  // ============= LOCATION FUNCTIONS =============
  const requestLocationPermission = useCallback(async () => {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location permission is required for attendance tracking',
          [{ text: 'OK' }]
        );
        setLocationPermission('denied');
        return false;
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      setLocationPermission(backgroundStatus === 'granted' ? 'granted' : 'foreground-only');
      return true;
    } catch (err) {
      console.error('Location permission error:', err);
      return false;
    }
  }, []);

  const startLocationTracking = useCallback(async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) return false;

      setIsTrackingLocation(true);
      
      // Start location service
      await locationService.startTracking((location) => {
        setCurrentLocation(location);
      });

      return true;
    } catch (err) {
      console.error('Start tracking error:', err);
      return false;
    }
  }, []);

  const stopLocationTracking = useCallback(async () => {
    try {
      await locationService.stopTracking();
      setIsTrackingLocation(false);
      return true;
    } catch (err) {
      console.error('Stop tracking error:', err);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: new Date(location.timestamp).toISOString(),
      };

      setCurrentLocation(locationData);
      return locationData;
    } catch (err) {
      console.error('Get current location error:', err);
      return null;
    }
  }, []);

  // ============= WEBSOCKET HANDLERS =============
  useEffect(() => {
    if (isAuthenticated) {
      websocketService.on('attendance:updated', (data) => {
        if (data.userId === user?.id) {
          setTodayAttendance(data.attendance);
          setIsCheckedIn(data.attendance?.status === 'checked-in');
        }
      });

      websocketService.on('location:updated', (data) => {
        if (data.userId === user?.id) {
          setCurrentLocation(data.location);
        }
      });

      return () => {
        websocketService.off('attendance:updated');
        websocketService.off('location:updated');
      };
    }
  }, [isAuthenticated, user]);

  // Initialize auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const value = {
    // Auth
    user,
    isAuthenticated,
    authLoading,
    login,
    register,
    logout,
    updateProfile,
    initAuth,

    // Attendance
    todayAttendance,
    attendanceHistory,
    attendanceStats,
    isCheckedIn,
    checkIn,
    checkOut,
    getTodayAttendance,
    getAttendanceHistory,
    getAttendanceStats,

    // Location
    currentLocation,
    locationPermission,
    isTrackingLocation,
    requestLocationPermission,
    startLocationTracking,
    stopLocationTracking,
    getCurrentLocation,

    // General
    loading,
    error,
    setError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
