const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Geofence name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['campus', 'building', 'department', 'custom'],
    default: 'campus'
  },
  // Center coordinates
  center: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  // Radius in meters
  radius: {
    type: Number,
    required: [true, 'Radius is required'],
    min: [10, 'Radius must be at least 10 meters'],
    max: [10000, 'Radius cannot exceed 10km']
  },
  // Address information
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    postalCode: String
  },
  // Working hours
  workingHours: {
    enabled: {
      type: Boolean,
      default: false
    },
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      },
      startTime: String, // HH:mm format
      endTime: String // HH:mm format
    }]
  },
  // Alert Configuration
  alerts: {
    entryAlert: {
      type: Boolean,
      default: true
    },
    exitAlert: {
      type: Boolean,
      default: true
    },
    violationAlert: {
      type: Boolean,
      default: true
    },
    notifyManagers: {
      type: Boolean,
      default: true
    }
  },
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  // Color for map display
  color: {
    type: String,
    default: '#3B82F6'
  },
  // Assigned users (if empty, applies to all)
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Audit fields
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
geofenceSchema.index({ createdBy: 1 });

// Method to check if a point is inside the geofence
geofenceSchema.methods.containsPoint = function(longitude, latitude) {
  const geolib = require('geolib');
  
  const distance = geolib.getDistance(
    { latitude: this.center.coordinates[1], longitude: this.center.coordinates[0] },
    { latitude, longitude }
  );
  
  return distance <= this.radius;
};

// Static method to find geofences containing a point
geofenceSchema.statics.findContainingPoint = async function(longitude, latitude) {
  return this.find({
    isActive: true,
    center: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: 10000 // Max 10km search radius
      }
    }
  }).then(geofences => {
    return geofences.filter(gf => gf.containsPoint(longitude, latitude));
  });
};

const Geofence = mongoose.model('Geofence', geofenceSchema);

module.exports = Geofence;
