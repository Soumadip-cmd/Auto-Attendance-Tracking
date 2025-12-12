import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const { token } = response.data.data;
        await AsyncStorage.setItem('accessToken', token);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        // Navigate to login (handled by context)
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  register: (userData) => 
    api.post('/auth/register', userData),
  
  logout: (refreshToken) => 
    api.post('/auth/logout', { refreshToken }),
  
  getMe: () => 
    api.get('/auth/me'),
  
  updatePrivacy: (settings) => 
    api.put('/auth/privacy', settings),
  
  updatePassword: (currentPassword, newPassword) => 
    api.put('/auth/password', { currentPassword, newPassword }),
};

// Location API
export const locationAPI = {
  submit: (locationData) => 
    api.post('/locations', locationData),
  
  submitBatch: (locations, deviceId) => 
    api.post('/locations/batch', { locations, deviceId }),
  
  getHistory: (params) => 
    api.get('/locations/history', { params }),
  
  deleteHistory: (startDate, endDate) => 
    api.delete('/locations/history', { data: { startDate, endDate } }),
};

// Attendance API
export const attendanceAPI = {
  checkIn: (latitude, longitude, method, deviceId) => 
    api.post('/attendance/checkin', { latitude, longitude, method, deviceId }),
  
  checkOut: (latitude, longitude, method, deviceId) => 
    api.post('/attendance/checkout', { latitude, longitude, method, deviceId }),
  
  getToday: () => 
    api.get('/attendance/today'),
  
  getRecords: (params) => 
    api.get('/attendance/records', { params }),
  
  getSummary: (params) => 
    api.get('/attendance/summary', { params }),
};

// Geofence API
export const geofenceAPI = {
  getAll: () => 
    api.get('/geofences'),
  
  check: (latitude, longitude) => 
    api.post('/geofences/check', { latitude, longitude }),
};

export default api;
