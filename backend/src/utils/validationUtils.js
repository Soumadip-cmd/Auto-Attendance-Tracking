const validator = require('validator');

class ValidationUtils {
  /**
   * Validate email address
   */
  isValidEmail(email) {
    return validator.isEmail(email);
  }

  /**
   * Validate phone number
   */
  isValidPhoneNumber(phone) {
    // Basic validation - customize based on your needs
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Validate password strength
   */
  isStrongPassword(password) {
    return validator.isStrongPassword(password, {
      minLength: 8,
      minLowercase:  1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1
    });
  }

  /**
   * Validate URL
   */
  isValidURL(url) {
    return validator.isURL(url);
  }

  /**
   * Validate MongoDB ObjectId
   */
  isValidObjectId(id) {
    return validator.isMongoId(id);
  }

  /**
   * Validate date string
   */
  isValidDate(dateString) {
    return validator. isISO8601(dateString);
  }

  /**
   * Validate UUID
   */
  isValidUUID(uuid) {
    return validator.isUUID(uuid);
  }

  /**
   * Validate alphanumeric
   */
  isAlphanumeric(str) {
    return validator.isAlphanumeric(str);
  }

  /**
   * Validate numeric
   */
  isNumeric(str) {
    return validator.isNumeric(str);
  }

  /**
   * Validate latitude
   */
  isValidLatitude(lat) {
    const latitude = parseFloat(lat);
    return !isNaN(latitude) && latitude >= -90 && latitude <= 90;
  }

  /**
   * Validate longitude
   */
  isValidLongitude(lon) {
    const longitude = parseFloat(lon);
    return !isNaN(longitude) && longitude >= -180 && longitude <= 180;
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(lat, lon) {
    return this.isValidLatitude(lat) && this.isValidLongitude(lon);
  }

  /**
   * Validate time format (HH:MM)
   */
  isValidTime(time) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * Validate employee ID format
   */
  isValidEmployeeId(id) {
    // Customize based on your employee ID format
    const empIdRegex = /^EMP[0-9]{4,6}$/;
    return empIdRegex.test(id);
  }

  /**
   * Sanitize input string
   */
  sanitizeString(str) {
    return validator.escape(str. trim());
  }

  /**
   * Validate string length
   */
  isValidLength(str, min, max) {
    return validator.isLength(str, { min, max });
  }

  /**
   * Check if string is empty
   */
  isEmpty(str) {
    return validator.isEmpty(str);
  }

  /**
   * Validate JSON string
   */
  isValidJSON(str) {
    return validator.isJSON(str);
  }

  /**
   * Validate IP address
   */
  isValidIP(ip) {
    return validator.isIP(ip);
  }

  /**
   * Validate hex color
   */
  isValidHexColor(color) {
    return validator.isHexColor(color);
  }

  /**
   * Validate role
   */
  isValidRole(role) {
    const validRoles = ['admin', 'manager', 'staff'];
    return validRoles.includes(role);
  }

  /**
   * Validate status
   */
  isValidAttendanceStatus(status) {
    const validStatuses = ['present', 'absent', 'late', 'half-day', 'on-leave', 'checked-in'];
    return validStatuses.includes(status);
  }

  /**
   * Validate tracking type
   */
  isValidTrackingType(type) {
    const validTypes = ['foreground', 'background', 'manual'];
    return validTypes.includes(type);
  }

  /**
   * Validate device type
   */
  isValidDeviceType(type) {
    const validTypes = ['ios', 'android', 'web'];
    return validTypes.includes(type);
  }

  /**
   * Validate geofence type
   */
  isValidGeofenceType(type) {
    const validTypes = ['campus', 'building', 'department', 'custom'];
    return validTypes.includes(type);
  }

  /**
   * Validate department name
   */
  isValidDepartment(department) {
    // Add your valid departments here
    const validDepartments = [
      'Engineering',
      'Sales',
      'Marketing',
      'HR',
      'Finance',
      'Operations',
      'IT',
      'Support'
    ];
    return validDepartments.includes(department);
  }

  /**
   * Validate file extension
   */
  isValidFileExtension(filename, allowedExtensions = ['. jpg', '.jpeg', '.png', '.pdf']) {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return allowedExtensions. includes(ext);
  }

  /**
   * Validate file size
   */
  isValidFileSize(sizeInBytes, maxSizeInMB = 5) {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return sizeInBytes <= maxSizeInBytes;
  }

  /**
   * Validate range
   */
  isInRange(value, min, max) {
    return value >= min && value <= max;
  }

  /**
   * Validate array not empty
   */
  isNonEmptyArray(arr) {
    return Array.isArray(arr) && arr.length > 0;
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(obj, requiredFields) {
    const missing = [];
    requiredFields.forEach(field => {
      if (!obj[field] || obj[field] === '') {
        missing.push(field);
      }
    });
    return {
      isValid: missing.length === 0,
      missingFields: missing
    };
  }

  /**
   * Validate pagination parameters
   */
  validatePagination(page, limit) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    return {
      isValid: ! isNaN(pageNum) && ! isNaN(limitNum) && pageNum > 0 && limitNum > 0 && limitNum <= 100,
      page: pageNum || 1,
      limit: Math.min(limitNum || 10, 100)
    };
  }
}

module.exports = new ValidationUtils();