const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  // Geofence name
  name: {
    type: String,
    required: [true, 'Please provide a geofence name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  // Description
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  // Center point of the geofence (GeoJSON Point)
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: [true, 'Please provide center coordinates'],
      validate: {
        validator: function(coords) {
          return coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'
      }
    }
  },
  // Radius in meters
  radius: {
    type: Number,
    required: [true, 'Please provide a radius'],
    min: [10, 'Radius must be at least 10 meters'],
    max: [10000, 'Radius cannot exceed 10,000 meters (10km)'],
    default: 100
  },
  // Type of geofence
  type: {
    type: String,
    enum: ['office', 'branch', 'site', 'custom'],
    default: 'office'
  },
  // Address (optional, for display)
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    formatted: String
  },
  // Working hours for this geofence
  workingHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    startTime: {
      type: String,
      default: '09:00'
    },
    endTime: {
      type: String,
      default: '18:00'
    },
    gracePeriod: {
      type: Number,
      default: 15,
      min: 0,
      max: 60
    },
    schedule: {
      monday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      tuesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      wednesday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      thursday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      friday: { start: String, end: String, enabled: { type: Boolean, default: true } },
      saturday: { start: String, end: String, enabled: { type: Boolean, default: false } },
      sunday: { start: String, end: String, enabled: { type: Boolean, default: false } }
    },
    timezone: {
      type: String,
      default: 'Asia/Kolkata'
    }
  },
  // Active status
  isActive: {
    type: Boolean,
    default: true
  },
  // Color for map display (hex code)
  color: {
    type: String,
    default: '#3b82f6', // Blue
    match: [/^#[0-9A-F]{6}$/i, 'Please provide a valid hex color code']
  },
  // Metadata
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

// Indexes
geofenceSchema.index({ center: '2dsphere' });
geofenceSchema.index({ isActive: 1 });
geofenceSchema.index({ type: 1 });

// Instance method: Check if a point is within this geofence
geofenceSchema.methods.containsPoint = function(longitude, latitude) {
  const R = 6371000; // Earth radius in meters
  const lat1 = this.center.coordinates[1];
  const lon1 = this.center.coordinates[0];
  const lat2 = latitude;
  const lon2 = longitude;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return {
    isInside: distance <= this.radius,
    distance: Math.round(distance)
  };
};

// Static method: Find all geofences that contain a point
geofenceSchema.statics.findContainingPoint = async function(longitude, latitude) {
  const allGeofences = await this.find({ isActive: true });
  const containing = [];

  for (const geofence of allGeofences) {
    const result = geofence.containsPoint(longitude, latitude);
    if (result.isInside) {
      containing.push({
        geofence,
        distance: result.distance
      });
    }
  }

  // Sort by distance (closest first)
  return containing.sort((a, b) => a.distance - b.distance);
};

// Static method: Find nearest geofence to a point
geofenceSchema.statics.findNearest = async function(longitude, latitude, maxDistance = 10000) {
  return this.findOne({
    center: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true
  });
};

// Virtual for formatted coordinates
geofenceSchema.virtual('coordinates').get(function() {
  return {
    latitude: this.center.coordinates[1],
    longitude: this.center.coordinates[0]
  };
});

// Ensure virtuals are included in JSON
geofenceSchema.set('toJSON', { virtuals: true });
geofenceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Geofence', geofenceSchema);
