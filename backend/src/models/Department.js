const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true,
    maxlength: 150
  },
  code: {
    type: String,
    required: [true, 'Department code is required'],
    trim: true,
    uppercase: true
  },
  hod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  defaultGeofences: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Geofence'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

departmentSchema.index({ college: 1, code: 1 }, { unique: true });
departmentSchema.index({ hod: 1 });
departmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Department', departmentSchema);
