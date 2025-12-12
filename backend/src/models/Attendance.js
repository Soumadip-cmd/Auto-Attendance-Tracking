const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Date of attendance (date only, no time)
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Check-in information
  checkIn: {
    time: {
      type: Date
    },
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number] // [longitude, latitude]
    },
    geofence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    method: {
      type: String,
      enum: ['manual', 'automatic', 'geofence'],
      default: 'manual'
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device'
    }
  },
  // Check-out information
  checkOut: {
    time: {
      type: Date
    },
    location: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number]
    },
    geofence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    method: {
      type: String,
      enum: ['manual', 'automatic', 'geofence'],
      default: 'manual'
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device'
    }
  },
  // Calculated fields
  duration: {
    type: Number, // in minutes
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'on-leave', 'checked-in'],
    default: 'absent'
  },
  // Late arrival
  isLate: {
    type: Boolean,
    default: false
  },
  lateBy: {
    type: Number, // in minutes
    default: 0
  },
  // Early departure
  isEarlyDeparture: {
    type: Boolean,
    default: false
  },
  earlyBy: {
    type: Number, // in minutes
    default: 0
  },
  // Time spent inside geofences
  geofenceTime: [{
    geofence: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Geofence'
    },
    duration: {
      type: Number // in minutes
    }
  }],
  // Break times
  breaks: [{
    startTime: Date,
    endTime: Date,
    duration: Number // in minutes
  }],
  totalBreakTime: {
    type: Number, // in minutes
    default: 0
  },
  // Working hours calculation
  expectedHours: {
    type: Number,
    default: 8 // in hours
  },
  actualHours: {
    type: Number,
    default: 0 // in hours
  },
  // Notes and remarks
  notes: {
    type: String
  },
  // Manager approval
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  approvalNotes: {
    type: String
  },
  // Anomaly detection
  anomalies: [{
    type: {
      type: String,
      enum: ['location-jump', 'impossible-speed', 'suspicious-pattern', 'multiple-devices']
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Compound indexes
attendanceSchema.index({ user: 1, date: -1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ user: 1, status: 1, date: -1 });

// Ensure only one attendance record per user per day
attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

// Pre-save hook to calculate duration and status
attendanceSchema.pre('save', function(next) {
  // Calculate duration if both check-in and check-out exist
  if (this.checkIn.time && this.checkOut.time) {
    const durationMs = this.checkOut.time - this.checkIn.time;
    this.duration = Math.floor(durationMs / (1000 * 60)); // Convert to minutes
    this.actualHours = (this.duration - this.totalBreakTime) / 60; // Convert to hours
    
    // Update status
    if (this.actualHours >= this.expectedHours * 0.8) {
      this.status = this.isLate ? 'late' : 'present';
    } else if (this.actualHours >= this.expectedHours * 0.5) {
      this.status = 'half-day';
    }
  } else if (this.checkIn.time) {
    this.status = 'checked-in';
  }
  
  next();
});

// Static method to get attendance summary for a user
attendanceSchema.statics.getUserSummary = async function(userId, startDate, endDate) {
  const records = await this.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const summary = {
    totalDays: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.isLate).length,
    halfDay: records.filter(r => r.status === 'half-day').length,
    totalHours: records.reduce((sum, r) => sum + (r.actualHours || 0), 0),
    averageHours: 0
  };
  
  summary.averageHours = summary.totalDays > 0 
    ? (summary.totalHours / summary.totalDays).toFixed(2) 
    : 0;
  
  return summary;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;
