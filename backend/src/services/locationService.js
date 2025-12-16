const { Location, Geofence, User, Device, Event, Attendance } = require('../models');
const logger = require('../config/logger');
const geolib = require('geolib');

class LocationService {
  /**
   * Process and save location data
   */
  async processLocation(userId, locationData, deviceId, ipAddress, userAgent) {
    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
      timestamp,
      trackingType,
      batteryLevel,
      networkType,
      activity,
      signature
    } = locationData;

    // Get user and verify consent
    const user = await User. findById(userId);
    if (!user. consentGiven || ! user.trackingEnabled) {
      throw new Error('Location tracking not enabled or consent not given');
    }

    // Find or create device
    let device = await Device. findOne({ user: userId, deviceId });
    if (!device) {
      device = await Device.create({
        user: userId,
        deviceId,
        deviceType: locationData.deviceType || 'android',
        isActive: true
      });
    }

    // Verify location signature
    const expectedSignature = this.generateLocationSignature(
      userId,
      longitude,
      latitude,
      new Date(timestamp).getTime()
    );

    if (signature !== expectedSignature) {
      logger.warn(`Tampered location data from user ${userId}`);
      
      await Event.log({
        eventType: 'location. tamper-detected',
        actor: userId,
        severity: 'critical',
        details: {
          latitude,
          longitude,
          timestamp,
          expectedSignature,
          receivedSignature: signature
        },
        device: device._id,
        ipAddress,
        userAgent
      });

      throw new Error('Location data integrity check failed');
    }

    // Find geofences containing this location
    const geofences = await Geofence.findContainingPoint(longitude, latitude);
    const geofenceData = geofences.map(gf => ({
      geofence: gf._id,
      status: 'inside'
    }));

    // Check for geofence violations
    await this.checkGeofenceViolations(user, geofences);

    // Create location record
    const location = await Location.create({
      user: userId,
      device: device._id,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      accuracy,
      altitude,
      altitudeAccuracy,
      heading,
      speed,
      timestamp:  new Date(timestamp),
      trackingType,
      batteryLevel,
      networkType,
      activity,
      signature,
      geofences: geofenceData,
      isVerified: true
    });

    // Update device last active
    device.lastActive = new Date();
    await device.save();

    // Check for automatic attendance (geofence-based)
    if (geofences.length > 0) {
      await this.handleGeofenceBasedAttendance(user, geofences[0], location);
    }

    // Log location update
    await Event.log({
      eventType: 'location. update',
      actor: userId,
      resource: { type: 'location', id: location._id },
      severity: 'info',
      details: {
        trackingType,
        geofences: geofences.map(gf => gf. name),
        batteryLevel
      },
      device: device._id
    });

    return {
      location,
      geofences:  geofences.map(gf => ({
        id: gf._id,
        name: gf.name,
        type: gf.type
      }))
    };
  }

  /**
   * Process batch location updates
   */
  async processBatchLocations(userId, locations, deviceId, ipAddress, userAgent) {
    const results = [];
    const errors = [];

    for (const locationData of locations) {
      try {
        const result = await this.processLocation(userId, locationData, deviceId, ipAddress, userAgent);
        results.push(result);
      } catch (error) {
        logger.error('Error processing location in batch:', error);
        errors.push({
          timestamp: locationData.timestamp,
          error: error.message
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors
    };
  }

  /**
   * Get location history for user
   */
  async getLocationHistory(userId, filters = {}) {
    const {
      startDate,
      endDate,
      geofenceId,
      trackingType,
      limit = 100,
      page = 1
    } = filters;

    const query = { user: userId };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (geofenceId) {
      query['geofences.geofence'] = geofenceId;
    }

    if (trackingType) {
      query. trackingType = trackingType;
    }

    const skip = (page - 1) * limit;

    const [locations, total] = await Promise. all([
      Location.find(query)
        .populate('device', 'deviceName deviceType')
        .populate('geofences. geofence', 'name type')
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Location.countDocuments(query)
    ]);

    return {
      locations,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit
      }
    };
  }

  /**
   * Get live locations for all active users (admin/manager)
   */
  async getLiveLocations(filters = {}) {
    const { department, role, activeOnly = true } = filters;

    // Get users based on filters
    const userQuery = { trackingEnabled: true };
    if (department) userQuery.department = department;
    if (role) userQuery.role = role;

    const users = await User.find(userQuery).select('_id firstName lastName email department role');
    const userIds = users.map(u => u._id);

    // Get latest location for each user (within last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const locations = await Location.aggregate([
      {
        $match: {
          user: { $in: userIds },
          timestamp: { $gte: fifteenMinutesAgo }
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$user',
          latestLocation: { $first: '$$ROOT' }
        }
      }
    ]);

    // Combine user info with location data
    const liveLocations = locations.map(loc => {
      const user = users.find(u => u._id.toString() === loc._id.toString());
      return {
        user:  {
          id: user._id,
          name: `${user.firstName} ${user. lastName}`,
          email: user.email,
          department: user.department,
          role: user.role
        },
        location: {
          latitude: loc.latestLocation.location.coordinates[1],
          longitude: loc.latestLocation.location.coordinates[0],
          accuracy: loc.latestLocation.accuracy,
          timestamp: loc.latestLocation.timestamp,
          batteryLevel: loc.latestLocation.batteryLevel,
          activity: loc.latestLocation.activity
        }
      };
    });

    return liveLocations;
  }

  /**
   * Get heatmap data for analytics
   */
  async getHeatmapData(filters = {}) {
    const {
      startDate,
      endDate,
      geofenceId,
      userId,
      department
    } = filters;

    const query = {};

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (geofenceId) {
      query['geofences.geofence'] = geofenceId;
    }

    if (userId) {
      query.user = userId;
    }

    if (department) {
      const users = await User.find({ department }).select('_id');
      query.user = { $in: users.map(u => u._id) };
    }

    const locations = await Location.find(query)
      .select('location.coordinates timestamp')
      .lean();

    // Convert to heatmap format
    const heatmapData = locations.map(loc => ({
      lat: loc.location.coordinates[1],
      lng: loc.location.coordinates[0],
      weight: 1
    }));

    // Group nearby points for better visualization
    const clusteredData = this.clusterHeatmapPoints(heatmapData, 0.0001); // ~11 meters

    return {
      points: clusteredData,
      total: locations.length
    };
  }

  /**
   * Delete location history for user (GDPR compliance)
   */
  async deleteLocationHistory(userId, beforeDate = null) {
    const query = { user: userId };

    if (beforeDate) {
      query.timestamp = { $lte: new Date(beforeDate) };
    }

    const result = await Location.deleteMany(query);

    // Log data deletion
    await Event.log({
      eventType: 'privacy.data-deletion',
      actor: userId,
      severity: 'info',
      details: {
        type: 'location',
        count: result.deletedCount,
        beforeDate
      }
    });

    return {
      deleted: result.deletedCount,
      message: 'Location history deleted successfully'
    };
  }

  /**
   * Generate location signature for tamper detection
   */
  generateLocationSignature(userId, longitude, latitude, timestamp) {
    const crypto = require('crypto');
    const secret = process.env.LOCATION_SIGNATURE_SECRET || 'default-secret-change-me';
    
    const data = `${userId}:${longitude}:${latitude}: ${timestamp}`;
    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Check for geofence violations
   */
  async checkGeofenceViolations(user, currentGeofences) {
    // Check if user should be in a specific geofence during working hours
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Get user's assigned geofences with working hours
    const assignedGeofences = await Geofence.find({
      _id: { $in: user.assignedGeofences },
      isActive: true,
      'workingHours.enabled': true
    });

    for (const geofence of assignedGeofences) {
      const schedule = geofence.workingHours.schedule. find(s => s.day === dayOfWeek);
      
      if (schedule && currentTime >= schedule.startTime && currentTime <= schedule.endTime) {
        // User should be in this geofence
        const isInGeofence = currentGeofences.some(g => g._id.toString() === geofence._id.toString());
        
        if (!isInGeofence && geofence.alerts.violationAlert) {
          // Geofence violation detected
          await Event.log({
            eventType: 'geofence.violation',
            actor: user._id,
            severity: 'warning',
            details: {
              geofence: geofence. name,
              expectedPresence: true,
              actualPresence: false,
              time: now
            }
          });

          // Notify managers if enabled
          if (geofence. alerts.notifyManagers) {
            await this.notifyGeofenceViolation(user, geofence);
          }
        }
      }
    }
  }

  /**
   * Handle geofence-based automatic attendance
   */
  async handleGeofenceBasedAttendance(user, geofence, location) {
    const attendanceService = require('./attendanceService');
    
    // Check if this is a work geofence
    if (geofence.type === 'campus' || geofence.type === 'building') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const attendance = await Attendance.findOne({
        user: user._id,
        date: today
      });

      // Auto check-in if not already checked in
      if (!attendance || ! attendance.checkIn. time) {
        await attendanceService.createCheckIn(
          user._id,
          {
            latitude: location.location.coordinates[1],
            longitude: location.location.coordinates[0],
            method: 'automatic',
            deviceId: location.device
          }
        );

        logger.info(`Auto check-in for user ${user._id} at geofence ${geofence.name}`);
      }
    }
  }

  /**
   * Notify managers about geofence violation
   */
  async notifyGeofenceViolation(user, geofence) {
    const emailService = require('./emailService');
    
    // Get managers
    const managers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true });

    if (managers.length > 0) {
      const violationData = {
        geofenceName: geofence.name,
        time: new Date().toLocaleString(),
        type: 'Outside designated area during working hours'
      };

      await emailService.sendGeofenceViolationAlert(managers, user, violationData);
    }
  }

  /**
   * Cluster heatmap points for better visualization
   */
  clusterHeatmapPoints(points, threshold) {
    const clusters = [];
    const processed = new Set();

    for (let i = 0; i < points.length; i++) {
      if (processed.has(i)) continue;

      const cluster = { ... points[i] };
      processed.add(i);

      for (let j = i + 1; j < points.length; j++) {
        if (processed. has(j)) continue;

        const distance = Math.sqrt(
          Math.pow(points[i].lat - points[j].lat, 2) +
          Math.pow(points[i].lng - points[j].lng, 2)
        );

        if (distance < threshold) {
          cluster.weight += points[j].weight;
          processed.add(j);
        }
      }

      clusters. push(cluster);
    }

    return clusters;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    return geolib.getDistance(
      { latitude: lat1, longitude: lon1 },
      { latitude:  lat2, longitude: lon2 }
    );
  }

  /**
   * Get location statistics for user
   */
  async getLocationStats(userId, startDate, endDate) {
    const locations = await Location.find({
      user: userId,
      timestamp:  {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ timestamp: 1 });

    if (locations.length === 0) {
      return {
        totalPoints: 0,
        totalDistance: 0,
        averageAccuracy: 0,
        trackingTypes: {}
      };
    }

    // Calculate total distance traveled
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      const prev = locations[i - 1];
      const curr = locations[i];
      
      const distance = this.calculateDistance(
        prev.location.coordinates[1],
        prev.location.coordinates[0],
        curr.location.coordinates[1],
        curr.location.coordinates[0]
      );

      // Only count if distance is reasonable (less than 10km between points)
      if (distance < 10000) {
        totalDistance += distance;
      }
    }

    // Calculate average accuracy
    const totalAccuracy = locations.reduce((sum, loc) => sum + loc.accuracy, 0);
    const averageAccuracy = totalAccuracy / locations.length;

    // Count tracking types
    const trackingTypes = locations.reduce((acc, loc) => {
      acc[loc.trackingType] = (acc[loc.trackingType] || 0) + 1;
      return acc;
    }, {});

    return {
      totalPoints:  locations.length,
      totalDistance:  Math.round(totalDistance),
      averageAccuracy: Math.round(averageAccuracy),
      trackingTypes,
      firstLocation: locations[0]. timestamp,
      lastLocation: locations[locations.length - 1].timestamp
    };
  }
}

module.exports = new LocationService();