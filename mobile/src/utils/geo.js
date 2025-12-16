/**
 * Calculate distance between two coordinates using Haversine formula
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Check if point is inside circle (geofence)
 */
export const isPointInCircle = (pointLat, pointLon, centerLat, centerLon, radius) => {
  const distance = calculateDistance(pointLat, pointLon, centerLat, centerLon);
  return distance <= radius;
};

/**
 * Format distance to readable string
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

/**
 * Get region for map display
 */
export const getRegion = (latitude, longitude, radius = 500) => {
  const latitudeDelta = (radius / 111320) * 2; // 1 degree latitude ≈ 111.32 km
  const longitudeDelta = latitudeDelta;

  return {
    latitude,
    longitude,
    latitudeDelta,
    longitudeDelta,
  };
};

/**
 * Get center point of multiple coordinates
 */
export const getCenterPoint = (coordinates) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  if (coordinates.length === 1) {
    return coordinates[0];
  }

  let totalLat = 0;
  let totalLon = 0;

  coordinates.forEach(coord => {
    totalLat += coord.latitude;
    totalLon += coord.longitude;
  });

  return {
    latitude: totalLat / coordinates.length,
    longitude: totalLon / coordinates.length,
  };
};
