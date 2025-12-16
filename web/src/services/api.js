import axios from 'axios';

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error. response?.data || error.message);
  }
);

// ==========================================
// AUTH APIs
// ==========================================

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return Promise.resolve();
  },
  getCurrentUser: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
};

// ==========================================
// USER APIs
// ==========================================

export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  updateProfile: (id, data) => api.put(`/users/${id}/profile`, data),
  changePassword: (id, data) => api.put(`/users/${id}/change-password`, data),
  uploadProfilePicture: (id, formData) => 
    api.post(`/users/${id}/upload-profile-picture`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteProfilePicture: (id) => api.delete(`/users/${id}/profile-picture`),
};

// ==========================================
// ATTENDANCE APIs
// ==========================================

export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  create: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
  checkIn: (data) => api.post('/attendance/check-in', data),
  checkOut: (id) => api.post(`/attendance/check-out/${id}`),
  getStats: (date) => api.get(`/attendance/stats/${date}`),
  getEmployeeMonthly: (empId, month) => api.get(`/attendance/employee/${empId}/${month}`),
  getTodayAttendance: () => {
    const today = new Date().toISOString().split('T')[0];
    return api. get('/attendance', { 
      params: { 
        startDate: today, 
        endDate: today 
      } 
    });
  },
};

// ==========================================
// DASHBOARD APIs
// ==========================================

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getWeeklyAttendance: () => api.get('/dashboard/weekly-attendance'),
  getDepartmentDistribution: () => api.get('/dashboard/department-distribution'),
  getMonthlyTrend: () => api.get('/dashboard/monthly-trend'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

// ==========================================
// REPORTS APIs
// ==========================================

export const reportsAPI = {
  generate: (data) => api.post('/reports/generate', data),
  getDaily: (date) => api.get(`/reports/daily/${date}`),
  getWeekly: (startDate, endDate) => api.get(`/reports/weekly/${startDate}/${endDate}`),
  getMonthly: (month, year) => api.get(`/reports/monthly/${month}/${year}`),
  exportData: (params) => api.get('/reports/export', { params }),
};

// ==========================================
// SETTINGS APIs
// ==========================================

export const settingsAPI = {
  updatePreferences: (userId, data) => api.put(`/users/${userId}/preferences`, data),
  updateNotifications: (userId, data) => api.put(`/users/${userId}/notifications`, data),
};

export const usersAPI = userAPI;

// Default export
export default api;