const mongoose = require('mongoose');

const liveLocationHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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
  accuracy: Number,
  altitude: Number,
  heading: Number,
  speed: Number,
  source: {
    type: String,
    enum: ['socket', 'foreground', 'background', 'manual', 'rest'],
    default: 'socket'
  },
  trackingSessionId: String,
  insideGeofence: Boolean,
  insideTemporaryPermission: Boolean,
  activePermission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MovementPermission'
  },
  violation: {
    type: Boolean,
    default: false,
    index: true
  },
  violationReason: String,
  timestamp: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

liveLocationHistorySchema.index({ location: '2dsphere' });
liveLocationHistorySchema.index({ user: 1, timestamp: -1 });
liveLocationHistorySchema.index({ college: 1, timestamp: -1 });
liveLocationHistorySchema.index({ department: 1, timestamp: -1 });

module.exports = mongoose.model('LiveLocationHistory', liveLocationHistorySchema);
