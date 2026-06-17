import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request for debugging
    console.log(`API Request: ${config.method. toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors. response.use(
  (response) => {
    console.log(`API Response: ${response.config.method.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error('API Error:', error. response || error);
    
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  updatePassword: (passwords) => api.put('/auth/update-password', passwords),
};

// User APIs
export const userAPI = {
  getAll:  (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateProfile: (id, data) => api.put(`/users/${id}/profile`, data),
  changePassword: (id, data) => api.put(`/users/${id}/change-password`, data),
  uploadProfilePicture: (id, formData) => {
    console.log('📤 Uploading profile picture for user ID:', id);
    console.log('📦 FormData contents:', formData);
    
    return api.post(`/users/${id}/upload-profile-picture`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 second timeout for file uploads
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`📊 Upload Progress: ${percentCompleted}%`);
      },
    });
  },
  deleteProfilePicture: (id) => {
    console.log('🗑️ Deleting profile picture for user ID:', id);
    return api.delete(`/users/${id}/profile-picture`);
  },
  getStats: () => api.get('/users/stats/overview'),
};

// Attendance APIs
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  getByDate: (date) => {
    console.log('📅 Fetching attendance for date:', date);
    // Use dedicated admin endpoint for date queries
    return api.get(`/attendance/date/${date}`);
  },
  checkIn: (data) => {
    console.log('✅ Check-in:', data);
    return api.post('/attendance/check-in', data);
  },
  checkOut: (id) => {
    console.log('🚪 Check-out:', id);
    return api.post(`/attendance/check-out/${id}`);
  },
  create: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
  getStats: (date) => api.get(`/attendance/stats/${date}`),
  getEmployeeHistory: (employeeId, month) => api.get(`/attendance/employee/${employeeId}/${month}`),
  getTodayAttendance: () => {
    const today = new Date().toISOString().split('T')[0];
    return api. get('/attendance', { params: { date: today } });
  },
  getWeeklyAttendance: () => api.get('/attendance/weekly'),
  getMonthlyAttendance:  (month, year) => api.get(`/attendance/monthly/${month}/${year}`),
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getWeeklyAttendance: () => api.get('/dashboard/weekly-attendance'),
  getDepartmentDistribution: () => api.get('/dashboard/department-distribution'),
  getMonthlyTrend: () => api.get('/dashboard/monthly-trend'),
  getRecentActivity: () => api.get('/dashboard/recent-activity'),
};

// Report APIs
export const reportAPI = {
  generate: (data) => api.post('/reports/generate', data),
  getDaily: (date) => {
    console.log('📊 Generating daily report for:', date);
    return api.get(`/reports/daily/${date}`);
  },
  getWeekly: (startDate, endDate) => {
    console.log('📊 Generating weekly report:', startDate, 'to', endDate);
    return api.get(`/reports/weekly/${startDate}/${endDate}`);
  },
  getMonthly: (month, year) => {
    console.log('📊 Generating monthly report:', month, year);
    return api.get(`/reports/monthly/${month}/${year}`);
  },
  export: (params) => api.get('/reports/export', { 
    params,
    responseType: 'blob',
  }),
  getEmployeeReport: (employeeId, startDate, endDate) => 
    api.get(`/reports/employee/${employeeId}`, { 
      params: { startDate, endDate } 
    }),
  getDepartmentReport: (department, startDate, endDate) => 
    api.get(`/reports/department/${department}`, { 
      params: { startDate, endDate } 
    }),
  getCustomReport: (filters) => {
    console.log('📊 Generating custom report with filters:', filters);
    return api.post('/reports/custom', filters);
  },
};

// Settings APIs
export const settingsAPI = {
  getCompanySettings: () => api.get('/settings/company'),
  updateCompanySettings: (data) => api.put('/settings/company', data),
  getSystemSettings: () => api.get('/settings/system'),
  updateSystemSettings: (data) => api.put('/settings/system', data),
  getNotificationSettings: (userId) => api.get(`/settings/notifications/${userId}`),
  updateNotificationSettings: (userId, data) => api.put(`/settings/notifications/${userId}`, data),
  getWorkSchedule: () => api.get('/settings/work-schedule'),
  updateWorkSchedule: (data) => api.put('/settings/work-schedule', data),
  getHolidays: () => api.get('/settings/holidays'),
  addHoliday: (data) => api.post('/settings/holidays', data),
  deleteHoliday: (id) => api.delete(`/settings/holidays/${id}`),
};

// Notification APIs
export const notificationAPI = {
  getAll: (userId) => api.get(`/notifications/${userId}`),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: (userId) => api.put(`/notifications/${userId}/read-all`),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteAll: (userId) => api.delete(`/notifications/${userId}/all`),
};

// Health Check
export const healthAPI = {
  check: () => api.get('/health'),
};

// Live Tracking APIs
export const liveTrackingAPI = {
  getLive: (params) => api.get('/live-tracking/live', { params }),
  submitLocation: (data) => api.post('/live-tracking/location', data),
  stopTracking: () => api.post('/live-tracking/stop'),
  getTeacher: (teacherId, params) => api.get(`/live-tracking/teacher/${teacherId}`, { params }),
  getTeacherTrail: (teacherId, params) => api.get(`/live-tracking/teacher/${teacherId}/trail`, { params }),
};

// Movement Permission APIs
export const movementPermissionAPI = {
  getAll: (params) => api.get('/movement-permissions', { params }),
  getById: (id) => api.get(`/movement-permissions/${id}`),
  create: (data) => api.post('/movement-permissions', data),
  approve: (id, data) => api.put(`/movement-permissions/${id}/approve`, data),
  reject: (id, data) => api.put(`/movement-permissions/${id}/reject`, data),
  cancel: (id, data) => api.put(`/movement-permissions/${id}/cancel`, data),
};

// Organization APIs
export const organizationAPI = {
  getColleges: (params) => api.get('/organization/colleges', { params }),
  createCollege: (data) => api.post('/organization/colleges', data),
  updateCollege: (id, data) => api.put(`/organization/colleges/${id}`, data),
  getDepartments: (params) => api.get('/organization/departments', { params }),
  createDepartment: (data) => api.post('/organization/departments', data),
  updateDepartment: (id, data) => api.put(`/organization/departments/${id}`, data),
  getDepartmentTeachers: (id) => api.get(`/organization/departments/${id}/teachers`),
  assignTeacher: (id, teacherId, action = 'assign') =>
    api.post(`/organization/departments/${id}/teachers`, { teacherId, action }),
};

// Export aliases for backward compatibility
export const usersAPI = userAPI;

// Export base API instance
export default api;
