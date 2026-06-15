const mongoose = require('mongoose');

const liveLocationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    index: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  accuracy: {
    type: Number,
    default: null
  },
  altitude: Number,
  heading: Number,
  speed: Number,
  source: {
    type: String,
    enum: ['socket', 'foreground', 'background', 'manual', 'rest'],
    default: 'socket'
  },
  trackingSessionId: String,
  insideGeofence: {
    type: Boolean,
    default: false
  },
  geofences: [{
    geofence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    name: String,
    distance: Number,
    radius: Number
  }],
  insideTemporaryPermission: {
    type: Boolean,
    default: false
  },
  activePermission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MovementPermission'
  },
  permissionDistance: Number,
  violation: {
    type: Boolean,
    default: false,
    index: true
  },
  violationReason: String,
  lastViolationAt: Date,
  lastSeenAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

liveLocationSchema.index({ location: '2dsphere' });
liveLocationSchema.index({ college: 1, lastSeenAt: -1 });
liveLocationSchema.index({ department: 1, lastSeenAt: -1 });

module.exports = mongoose.model('LiveLocation', liveLocationSchema);
