import axios from 'axios';
import { Platform } from 'react-native';
import * as AndroidGeofencing from 'android-geofencing';
import { config, APP_CONFIG } from '../constants/config';
import { secureStorage } from '../utils/storage';

// Keeps the native geofencing module's cached auth token in sync so it can
// submit check-in/check-out directly when the app is fully killed. Without
// this, only the JS-side 2-minute interval in teacherLiveTrackingService
// refreshes that cache, which stops running the moment the app is closed —
// so a token that rotates while the app is backgrounded/killed goes stale
// and background auto attendance silently falls back to queuing events.
const cacheAuthContextForBackground = async (token) => {
  if (Platform.OS !== 'android' || !token) return;
  try {
    if (typeof AndroidGeofencing.cacheAuthContext !== 'function') return;
    // Refresh token is long-lived and unchanged by a /auth/refresh call —
    // pass it along too so the native side can refresh its own cached
    // access token later without needing JS to be running at all.
    const refreshToken = await secureStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY);
    try {
      // 3-arg form — only understood once the native module has been
      // rebuilt with refresh-token support. Falls back below on older
      // installed builds so this never regresses basic token caching.
      await AndroidGeofencing.cacheAuthContext(token, config.API_URL, refreshToken || '');
    } catch (arityError) {
      await AndroidGeofencing.cacheAuthContext(token, config.API_URL);
    }
  } catch (error) {
    // Best-effort — background submission will just fall back to queuing.
  }
};

// Create axios instance
const api = axios.create({
  baseURL: config.API_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

const isPublicAuthRequest = (url = '') =>
  PUBLIC_AUTH_ENDPOINTS.some((endpoint) => String(url).includes(endpoint));

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (__DEV__ && !isPublicAuthRequest(config.url)) {
      console.warn('No auth token for protected request:', config.url);
    }
    
    // Only log in development if needed
    // console.log(`📡 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    // Only log in development if needed
    // console.log(`✅ API Response: ${response.config.url}`, response.status);
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await secureStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY);
        
        if (refreshToken) {
          const response = await axios.post(
            `${config.API_URL}/auth/refresh`,
            { refreshToken }
          );

          const { token } = response.data.data;
          await secureStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
          await cacheAuthContextForBackground(token);

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token failed - logout user
        await secureStorage. removeItem(APP_CONFIG.TOKEN_KEY);
        await secureStorage.removeItem(APP_CONFIG.REFRESH_TOKEN_KEY);
        
        // Emit event to redirect to login
        // You can use your navigation/auth store here
        console.error('Token refresh failed - redirecting to login');
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.message || error.message || 'Something went wrong';
    
    // Only log network errors once, not repeatedly
    if (__DEV__ && !error.config?._logged) {
      console.warn(`⚠️ API Error: ${error.config?.url}`, errorMessage);
      if (error.config) error.config._logged = true;
    }

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// API Methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
};

export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  getToday: () => api.get('/attendance/today'),
  getHistory: (params) => api.get('/attendance/history', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  getStats: (params) => api.get('/attendance/stats', { params }),
  autoCheckIn: (data) => api.post('/attendance/auto-checkin', data),
  autoCheckOut: (data) => api.post('/attendance/auto-checkout', data),
  exportMyReport: (params) => api.get('/attendance/export/my', { params }),
};

export const locationAPI = {
  track: (data) => api.post('/locations', data),
  submitBatch: (locations) => api.post('/locations/batch', { locations }),
  getHistory: (params) => api.get('/locations/history', { params }),
};

export const liveTrackingAPI = {
  submitLocation: (data) => api.post('/live-tracking/location', data),
  submitGeofenceEvent: (data) => api.post('/live-tracking/geofence-event', data),
  stopTracking: () => api.post('/live-tracking/stop'),
  getLive: (params) => api.get('/live-tracking/live', { params }),
  getTeacherTrail: (teacherId, params) => api.get(`/live-tracking/teacher/${teacherId}/trail`, { params }),
  getActivePermission: () => api.get('/movement-permissions/me/active'),
};

export const movementPermissionAPI = {
  getAll: (params) => api.get('/movement-permissions', { params }),
  getById: (id) => api.get(`/movement-permissions/${id}`),
  create: (data) => api.post('/movement-permissions', data),
  approve: (id, data) => api.put(`/movement-permissions/${id}/approve`, data),
  reject: (id, data) => api.put(`/movement-permissions/${id}/reject`, data),
  cancel: (id, data) => api.put(`/movement-permissions/${id}/cancel`, data),
  getActivePermission: () => api.get('/movement-permissions/me/active'),
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  registerDevice: (deviceId, token, deviceType) =>
    api.post('/notifications/register-device', { deviceId, token, deviceType }),
  unregisterDevice: (deviceId) =>
    api.post('/notifications/unregister-device', { deviceId }),
};

export const userAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  uploadProfilePicture: (id, formData) => api.post(`/users/${id}/upload-profile-picture`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteProfilePicture: (id) => api.delete(`/users/${id}/profile-picture`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard'),
  getAdminStats: () => api.get('/dashboard/admin'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

export const reportAPI = {
  generate: (params) => api.post('/reports/generate', params),
  getById: (id) => api.get(`/reports/${id}`),
  download: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
};

export const geofenceAPI = {
  getAll: (params) => api.get('/geofences', { params }),
  getById: (id) => api.get(`/geofences/${id}`),
  create: (data) => api.post('/geofences', data),
  update: (id, data) => api.put(`/geofences/${id}`, data),
  delete: (id) => api.delete(`/geofences/${id}`),
  checkLocation: (latitude, longitude) => api.post('/geofences/check', { latitude, longitude }),
  getNearby: (latitude, longitude, maxDistance = 5000) => api.get('/geofences/nearby', { 
    params: { latitude, longitude, maxDistance } 
  }),
};

export default api;
