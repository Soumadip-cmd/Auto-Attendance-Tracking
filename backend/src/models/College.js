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
      // No default — an incomplete { type:'Point' } without coordinates
      // breaks the 2dsphere index.
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

// sparse: true → documents without valid coordinates are excluded from the
// geo index instead of causing an "invalid GeoJSON" error.
collegeSchema.index({ location: '2dsphere' }, { sparse: true });
collegeSchema.index({ isActive: 1 });

// Remove incomplete location subdocument before saving so the sparse index
// never sees { type:'Point' } without coordinates.
collegeSchema.pre('save', function (next) {
  if (this.location && (!this.location.coordinates || this.location.coordinates.length !== 2)) {
    this.location = undefined;
  }
  next();
});

collegeSchema.pre('findOneAndUpdate', function (next) {
  const upd = this.getUpdate();
  const loc = upd?.location ?? upd?.$set?.location;
  if (loc && (!loc.coordinates || loc.coordinates.length !== 2)) {
    if (upd.location) delete upd.location;
    if (upd.$set?.location) delete upd.$set.location;
  }
  next();
});

module.exports = mongoose.model('College', collegeSchema);
