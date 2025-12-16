const geolib = require('geolib');

class GeoUtils {
  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(point1, point2) {
    return geolib.getDistance(
      { latitude: point1.latitude, longitude: point1.longitude },
      { latitude: point2.latitude, longitude: point2.longitude }
    );
  }

  /**
   * Calculate distance in kilometers
   */
  calculateDistanceInKm(point1, point2) {
    return this.calculateDistance(point1, point2) / 1000;
  }

  /**
   * Calculate distance in miles
   */
  calculateDistanceInMiles(point1, point2) {
    return this.calculateDistance(point1, point2) * 0.000621371;
  }

  /**
   * Check if point is within radius of another point
   */
  isWithinRadius(center, point, radiusInMeters) {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusInMeters;
  }

  /**
   * Get center point of multiple coordinates
   */
  getCenterPoint(coordinates) {
    if (! coordinates || coordinates.length === 0) {
      return null;
    }

    return geolib.getCenter(
      coordinates.map(coord => ({
        latitude: coord.latitude,
        longitude: coord.longitude
      }))
    );
  }

  /**
   * Get bounding box for coordinates
   */
  getBoundingBox(coordinates) {
    if (!coordinates || coordinates.length === 0) {
      return null;
    }

    return geolib.getBounds(
      coordinates.map(coord => ({
        latitude: coord.latitude,
        longitude: coord.longitude
      }))
    );
  }

  /**
   * Check if point is inside polygon
   */
  isPointInPolygon(point, polygon) {
    return geolib.isPointInPolygon(
      { latitude: point.latitude, longitude: point.longitude },
      polygon. map(p => ({ latitude: p.latitude, longitude: p.longitude }))
    );
  }

  /**
   * Get compass direction between two points
   */
  getCompassDirection(point1, point2) {
    const bearing = geolib.getGreatCircleBearing(
      { latitude:  point1.latitude, longitude: point1.longitude },
      { latitude: point2.latitude, longitude: point2.longitude }
    );

    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(bearing / 45) % 8;
    return directions[index];
  }

  /**
   * Get bearing between two points (0-360 degrees)
   */
  getBearing(point1, point2) {
    return geolib.getRhumbLineBearing(
      { latitude:  point1.latitude, longitude: point1.longitude },
      { latitude: point2.latitude, longitude: point2.longitude }
    );
  }

  /**
   * Convert coordinates to GeoJSON Point
   */
  toGeoJSONPoint(latitude, longitude) {
    return {
      type: 'Point',
      coordinates: [longitude, latitude]
    };
  }

  /**
   * Convert GeoJSON Point to coordinates object
   */
  fromGeoJSONPoint(geoJSON) {
    if (!geoJSON || geoJSON.type !== 'Point') {
      return null;
    }

    return {
      longitude: geoJSON.coordinates[0],
      latitude: geoJSON.coordinates[1]
    };
  }

  /**
   * Create circle polygon (for geofencing)
   */
  createCirclePolygon(center, radiusInMeters, numberOfPoints = 32) {
    const points = [];
    
    for (let i = 0; i < numberOfPoints; i++) {
      const angle = (i * 360) / numberOfPoints;
      const point = geolib.computeDestinationPoint(
        { latitude: center.latitude, longitude: center.longitude },
        radiusInMeters,
        angle
      );
      points.push(point);
    }

    return points;
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(latitude, longitude, precision = 6) {
    return {
      latitude: parseFloat(latitude.toFixed(precision)),
      longitude: parseFloat(longitude.toFixed(precision))
    };
  }

  /**
   * Get nearest point from array of points
   */
  getNearestPoint(target, points) {
    if (!points || points.length === 0) {
      return null;
    }

    let nearest = points[0];
    let minDistance = this.calculateDistance(target, points[0]);

    points.forEach(point => {
      const distance = this.calculateDistance(target, point);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = point;
      }
    });

    return { point: nearest, distance: minDistance };
  }

  /**
   * Calculate total distance of path
   */
  calculatePathDistance(points) {
    if (!points || points.length < 2) {
      return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += this.calculateDistance(points[i - 1], points[i]);
    }

    return totalDistance;
  }

  /**
   * Get speed in km/h from distance and time
   */
  calculateSpeed(distanceInMeters, timeInSeconds) {
    if (timeInSeconds === 0) return 0;
    const speedMps = distanceInMeters / timeInSeconds;
    return speedMps * 3.6; // Convert to km/h
  }

  /**
   * Simplify path using Douglas-Peucker algorithm
   */
  simplifyPath(points, tolerance = 10) {
    if (points.length < 3) return points;

    // Basic implementation - you can use a library like simplify-js for better results
    return points.filter((point, index) => {
      if (index === 0 || index === points.length - 1) return true;
      
      const prev = points[index - 1];
      const distance = this.calculateDistance(prev, point);
      return distance > tolerance;
    });
  }

  /**
   * Convert decimal degrees to DMS (Degrees Minutes Seconds)
   */
  toDMS(decimal, isLatitude) {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = ((minutesFloat - minutes) * 60).toFixed(2);

    const direction = isLatitude
      ? decimal >= 0 ? 'N' : 'S'
      :  decimal >= 0 ? 'E' : 'W';

    return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
  }

  /**
   * Get area of polygon in square meters
   */
  getPolygonArea(polygon) {
    if (!polygon || polygon. length < 3) {
      return 0;
    }

    return geolib.getAreaOfPolygon(
      polygon.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
    );
  }

  /**
   * Cluster nearby points
   */
  clusterPoints(points, maxDistance = 100) {
    if (!points || points.length === 0) {
      return [];
    }

    const clusters = [];
    const processed = new Set();

    points.forEach((point, i) => {
      if (processed.has(i)) return;

      const cluster = [point];
      processed.add(i);

      points.forEach((otherPoint, j) => {
        if (i !== j && ! processed.has(j)) {
          const distance = this. calculateDistance(point, otherPoint);
          if (distance <= maxDistance) {
            cluster.push(otherPoint);
            processed.add(j);
          }
        }
      });

      clusters.push({
        center: this.getCenterPoint(cluster),
        points: cluster,
        count: cluster.length
      });
    });

    return clusters;
  }

  /**
   * Get elevation difference (requires elevation data)
   */
  getElevationDifference(point1, point2) {
    if (!point1.elevation || !point2.elevation) {
      return null;
    }
    return Math.abs(point2.elevation - point1.elevation);
  }

  /**
   * Calculate geofence coverage percentage
   */
  calculateGeofenceCoverage(userLocations, geofenceCenter, geofenceRadius) {
    if (!userLocations || userLocations.length === 0) {
      return 0;
    }

    const locationsInside = userLocations.filter(loc =>
      this.isWithinRadius(geofenceCenter, loc, geofenceRadius)
    );

    return (locationsInside.length / userLocations.length) * 100;
  }
}

module.exports = new GeoUtils();