/**
 * Services Index
 * Centralized export of all services
 */

const authService = require('./authService');
const locationService = require('./locationService');
const attendanceService = require('./attendanceService');
const analyticsService = require('./analyticsService');
const exportService = require('./exportService');
const emailService = require('./emailService');
const notificationService = require('./notificationService');
const cacheService = require('./cacheService');
const fileUploadService = require('./fileUploadService');

module.exports = {
  authService,
  locationService,
  attendanceService,
  analyticsService,
  exportService,
  emailService,
  notificationService,
  cacheService,
  fileUploadService
};