import axios from 'axios';
import { config, APP_CONFIG } from '../constants/config';
import { secureStorage } from '../utils/storage';

// Create axios instance
const api = axios.create({
  baseURL: config.API_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`📡 API Request: ${config. method. toUpperCase()} ${config.url}`);
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
    console.log(`✅ API Response: ${response. config.url}`, response.status);
    return response. data;
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

          const { token } = response.data. data;
          await secureStorage.setItem(APP_CONFIG. TOKEN_KEY, token);

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
    console.error(`❌ API Error: ${error.config?. url}`, errorMessage);

    return Promise.reject({
      message: errorMessage,
      status:  error.response?.status,
      data: error.response?. data,
    });
  }
);

// API Methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const attendanceAPI = {
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (data) => api.post('/attendance/check-out', data),
  getToday: () => api.get('/attendance/today'),
  getHistory: (params) => api.get('/attendance/history', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  getStats: (params) => api.get('/attendance/stats', { params }),
};

export const locationAPI = {
  track: (data) => api.post('/location/track', data),
  getHistory: (params) => api.get('/location/history', { params }),
};

export const geofenceAPI = {
  getAll: () => api.get('/geofences'),
  getById: (id) => api.get(`/geofences/${id}`),
  checkLocation: (data) => api.post('/geofences/check', data),
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

export default api;