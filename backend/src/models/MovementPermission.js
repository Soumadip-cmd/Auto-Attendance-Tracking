const mongoose = require('mongoose');

const movementPermissionSchema = new mongoose.Schema({
  teacher: {
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
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  allowedLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 &&
            coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid allowed location coordinates'
      }
    }
  },
  radius: {
    type: Number,
    required: true,
    min: 10,
    max: 10000,
    default: 100
  },
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: {
    type: Date,
    required: true,
    index: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  decisionNotes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

movementPermissionSchema.index({ allowedLocation: '2dsphere' });
movementPermissionSchema.index({ teacher: 1, status: 1, startTime: 1, endTime: 1 });

movementPermissionSchema.statics.findActiveForTeacher = function(teacherId, at = new Date()) {
  return this.findOne({
    teacher: teacherId,
    status: 'approved',
    startTime: { $lte: at },
    endTime: { $gte: at }
  }).sort({ endTime: 1 });
};

movementPermissionSchema.pre('validate', function(next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate('endTime', 'End time must be after start time');
  }
  next();
});

module.exports = mongoose.model('MovementPermission', movementPermissionSchema);
