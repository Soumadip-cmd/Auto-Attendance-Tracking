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
  // Using Mixed so Mongoose never auto-initialises the location sub-path.
  // An incomplete { type:'Point' } without coordinates causes a MongoDB
  // "Can't extract geo keys" error on the 2dsphere index even with sparse:true,
  // so we must ensure the field is ABSENT (not just null/undefined) when
  // coordinates are not provided.
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

// sparse: true → documents without a location field are skipped by the index.
// Documents with an INVALID location (no coordinates) would still cause an error
// even with sparse — the pre-save hook below prevents that from ever happening.
collegeSchema.index({ location: '2dsphere' }, { sparse: true });
collegeSchema.index({ isActive: 1 });

// Strip location from the raw document before any save so the 2dsphere index
// never sees an incomplete GeoJSON object.
function _stripBadLocation(doc) {
  const loc = doc._doc ? doc._doc.location : doc.location;
  if (loc !== undefined && loc !== null) {
    if (
      typeof loc !== 'object' ||
      !Array.isArray(loc.coordinates) ||
      loc.coordinates.length !== 2
    ) {
      if (doc._doc) {
        delete doc._doc.location;
      } else {
        delete doc.location;
      }
      if (typeof doc.markModified === 'function') {
        doc.markModified('location');
      }
    }
  }
}

collegeSchema.pre('save', function (next) {
  _stripBadLocation(this);
  next();
});

collegeSchema.pre('findOneAndUpdate', function (next) {
  const upd = this.getUpdate();
  const loc = upd?.location ?? upd?.$set?.location;
  if (loc && (!Array.isArray(loc.coordinates) || loc.coordinates.length !== 2)) {
    if (upd.location) delete upd.location;
    if (upd.$set?.location) delete upd.$set.location;
  }
  next();
});

module.exports = mongoose.model('College', collegeSchema);
