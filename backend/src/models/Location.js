const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  // Location coordinates
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  // Location accuracy
  accuracy: {
    type: Number,
    required: true
  },
  altitude: {
    type: Number
  },
  altitudeAccuracy: {
    type: Number
  },
  heading: {
    type: Number
  },
  speed: {
    type: Number
  },
  // Timestamp from device
  timestamp: {
    type: Date,
    required: true
  },
  // Tracking context
  trackingType: {
    type: String,
    enum: ['foreground', 'background', 'manual'],
    default: 'foreground'
  },
  // Battery level at time of tracking (0-100)
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  // Network type
  networkType: {
    type: String,
    enum: ['wifi', 'cellular', 'none', 'unknown']
  },
  // Geofence information
  geofences: [{
    geofence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    status: {
      type: String,
      enum: ['inside', 'outside']
    }
  }],
  // Tamper detection
  signature: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Address (reverse geocoded, optional)
  address: {
    type: String
  },
  // Activity type (if available from device)
  activity: {
    type: String,
    enum: ['still', 'walking', 'running', 'driving', 'cycling', 'unknown']
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
locationSchema.index({ location: '2dsphere' });
locationSchema.index({ user: 1, timestamp: -1 });
locationSchema.index({ user: 1, createdAt: -1 });
locationSchema.index({ device: 1, timestamp: -1 });
locationSchema.index({ 'geofences.geofence': 1 });
locationSchema.index({ timestamp: 1 }); // For TTL cleanup
locationSchema.index({ createdAt: 1 }); // For retention policy

// Method to verify location signature
locationSchema.methods.verifySignature = function() {
  const crypto = require('crypto');
  const secret = process.env.LOCATION_SIGNATURE_SECRET;
  
  const data = `${this.user}:${this.location.coordinates[0]}:${this.location.coordinates[1]}:${this.timestamp.getTime()}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
  
  this.isVerified = (this.signature === expectedSignature);
  return this.isVerified;
};

// Static method to generate signature (for testing/validation)
locationSchema.statics.generateSignature = function(userId, longitude, latitude, timestamp) {
  const crypto = require('crypto');
  const secret = process.env.LOCATION_SIGNATURE_SECRET;
  
  const data = `${userId}:${longitude}:${latitude}:${timestamp}`;
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
};

// Pre-save hook to verify signature
locationSchema.pre('save', function(next) {
  if (this.isNew) {
    this.verifySignature();
  }
  next();
});

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
