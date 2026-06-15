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
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: function(coords) {
          if (!coords || coords.length === 0) return true;
          return coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 &&
            coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid college coordinates'
      }
    }
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

collegeSchema.index({ location: '2dsphere' });
collegeSchema.index({ isActive: 1 });

module.exports = mongoose.model('College', collegeSchema);
