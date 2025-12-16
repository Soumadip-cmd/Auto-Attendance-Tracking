import axios from 'axios';

// Use optional chaining to safely access env variables
const API_URL = import. meta?.env?.VITE_API_URL || 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api. interceptors.request.use(
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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStats: () => api.get('/users/stats'),
};

// Attendance API
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  getByUser: (userId, params) => api.get(`/attendance/user/${userId}`, { params }),
  getStats: (params) => api.get('/attendance/stats', { params }),
  getDashboard: () => api.get('/attendance/dashboard'),
};

// Reports API
export const reportsAPI = {
  getDaily: (date) => api.get('/reports/daily', { params: { date } }),
  getWeekly: (startDate, endDate) => api.get('/reports/weekly', { params: { startDate, endDate } }),
  getMonthly: (year, month) => api.get('/reports/monthly', { params: { year, month } }),
  export: (type, params) => api.get(`/reports/export/${type}`, { params, responseType: 'blob' }),
};

export default api;