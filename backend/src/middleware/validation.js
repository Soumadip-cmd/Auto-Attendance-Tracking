const Joi = require('joi');

/**
 * Middleware to validate request body against a Joi schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
};

/**
 * Validation schemas
 */
const schemas = {
  // User registration
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    role: Joi.string().valid('admin', 'manager', 'staff').default('staff'),
    employeeId: Joi.string().optional(),
    department: Joi.string().optional(),
    phoneNumber: Joi.string().optional()
  }),

  // User login
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  // Refresh token
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  }),

  // Update user
  updateUser: Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    department: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    profileImage: Joi.string().uri().optional()
  }),

  // Update password
  updatePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required()
  }),

  // Privacy settings
  privacySettings: Joi.object({
    consentGiven: Joi.boolean().optional(),
    trackingEnabled: Joi.boolean().optional(),
    shareLocationWithManagers: Joi.boolean().optional(),
    allowHistoryAccess: Joi.boolean().optional(),
    dataRetentionDays: Joi.number().min(1).max(365).optional()
  }),

  // Device registration
  registerDevice: Joi.object({
    deviceId: Joi.string().required(),
    deviceName: Joi.string().optional(),
    deviceType: Joi.string().valid('ios', 'android', 'web').required(),
    osVersion: Joi.string().optional(),
    appVersion: Joi.string().optional(),
    pushToken: Joi.string().optional()
  }),

  // Location submission
  submitLocation: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().min(0).required(),
    altitude: Joi.number().optional(),
    altitudeAccuracy: Joi.number().optional(),
    heading: Joi.number().min(0).max(360).optional(),
    speed: Joi.number().min(0).optional(),
    timestamp: Joi.date().iso().required(),
    trackingType: Joi.string().valid('foreground', 'background', 'manual').default('foreground'),
    batteryLevel: Joi.number().min(0).max(100).optional(),
    networkType: Joi.string().valid('wifi', 'cellular', 'none', 'unknown').optional(),
    activity: Joi.string().valid('still', 'walking', 'running', 'driving', 'cycling', 'unknown').optional(),
    signature: Joi.string().required(),
    deviceId: Joi.string().required()
  }),

  // Batch location submission
  submitLocations: Joi.object({
    locations: Joi.array().items(Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      accuracy: Joi.number().min(0).required(),
      altitude: Joi.number().optional(),
      altitudeAccuracy: Joi.number().optional(),
      heading: Joi.number().min(0).max(360).optional(),
      speed: Joi.number().min(0).optional(),
      timestamp: Joi.date().iso().required(),
      trackingType: Joi.string().valid('foreground', 'background', 'manual').default('foreground'),
      batteryLevel: Joi.number().min(0).max(100).optional(),
      networkType: Joi.string().valid('wifi', 'cellular', 'none', 'unknown').optional(),
      activity: Joi.string().valid('still', 'walking', 'running', 'driving', 'cycling', 'unknown').optional(),
      signature: Joi.string().required()
    })).min(1).max(100).required(),
    deviceId: Joi.string().required()
  }),

  // Check-in
  checkIn: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    method: Joi.string().valid('manual', 'automatic').default('manual'),
    deviceId: Joi.string().required()
  }),

  // Check-out
  checkOut: Joi.object({
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    method: Joi.string().valid('manual', 'automatic').default('manual'),
    deviceId: Joi.string().required()
  }),

  // Create geofence
  createGeofence: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    type: Joi.string().valid('campus', 'building', 'department', 'custom').default('campus'),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(10).max(10000).required(),
    address: Joi.object({
      street: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      country: Joi.string().allow('').optional(),
      postalCode: Joi.string().allow('').optional()
    }).optional(),
    workingHours: Joi.object({
      enabled: Joi.boolean().default(false),
      schedule: Joi.array().items(Joi.object({
        day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
        startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
        endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
      })).optional()
    }).optional(),
    alerts: Joi.object({
      entryAlert: Joi.boolean().default(true),
      exitAlert: Joi.boolean().default(true),
      violationAlert: Joi.boolean().default(true),
      notifyManagers: Joi.boolean().default(true)
    }).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    assignedUsers: Joi.array().items(Joi.string()).optional(),
    isActive: Joi.boolean().optional()
  }),

  // Update geofence
  updateGeofence: Joi.object({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    type: Joi.string().valid('campus', 'building', 'department', 'custom').optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().min(10).max(10000).optional(),
    address: Joi.object({
      street: Joi.string().allow('').optional(),
      city: Joi.string().allow('').optional(),
      state: Joi.string().allow('').optional(),
      country: Joi.string().allow('').optional(),
      postalCode: Joi.string().allow('').optional()
    }).optional(),
    workingHours: Joi.object({
      enabled: Joi.boolean().optional(),
      schedule: Joi.array().items(Joi.object({
        day: Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday').required(),
        startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(),
        endTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required()
      })).optional()
    }).optional(),
    alerts: Joi.object({
      entryAlert: Joi.boolean().optional(),
      exitAlert: Joi.boolean().optional(),
      violationAlert: Joi.boolean().optional(),
      notifyManagers: Joi.boolean().optional()
    }).optional(),
    isActive: Joi.boolean().optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    assignedUsers: Joi.array().items(Joi.string()).optional()
  })
};

module.exports = {
  validate,
  schemas
};
