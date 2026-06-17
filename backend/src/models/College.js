const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'College name is required'],
    trim: true,
    maxlength: 150
  },
  code: {
    type: String,
    required: [true, 'College code is required'],
    trim: true,
    uppercase: true,
    unique: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    formatted: String
  },
  // Mixed type: Mongoose never auto-initialises sub-paths.
  // No 2dsphere index — college location is display-only metadata;
  // no geospatial queries run against this collection.
  location: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined,
  },
  phoneNumber: String,
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
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

// Only a simple active index — no 2dsphere on location
collegeSchema.index({ isActive: 1 });

module.exports = mongoose.model('College', collegeSchema);
