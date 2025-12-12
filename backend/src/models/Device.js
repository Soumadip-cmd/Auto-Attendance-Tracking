const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  deviceName: {
    type: String,
    trim: true
  },
  deviceType: {
    type: String,
    enum: ['ios', 'android', 'web'],
    required: true
  },
  osVersion: {
    type: String
  },
  appVersion: {
    type: String
  },
  // Push Notification Token
  pushToken: {
    type: String
  },
  // Device Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  // Location Permissions
  locationPermission: {
    type: String,
    enum: ['granted', 'denied', 'not-determined', 'restricted'],
    default: 'not-determined'
  },
  backgroundLocationEnabled: {
    type: Boolean,
    default: false
  },
  // Battery Optimization
  batteryOptimizationEnabled: {
    type: Boolean,
    default: true
  },
  // Tracking Configuration
  trackingConfig: {
    updateInterval: {
      type: Number,
      default: 300000 // 5 minutes in milliseconds
    },
    distanceFilter: {
      type: Number,
      default: 50 // meters
    },
    accuracy: {
      type: String,
      enum: ['low', 'medium', 'high', 'best'],
      default: 'high'
    }
  }
}, {
  timestamps: true
});

// Indexes
deviceSchema.index({ user: 1, deviceId: 1 }, { unique: true });
deviceSchema.index({ user: 1 });
deviceSchema.index({ isActive: 1 });
deviceSchema.index({ lastActive: -1 });

// Update lastActive on any update
deviceSchema.pre('save', function(next) {
  this.lastActive = Date.now();
  next();
});

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
