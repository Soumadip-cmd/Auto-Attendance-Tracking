const geoUtils = require('../../../src/utils/geoUtils');

describe('GeoUtils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const point1 = { latitude: 40.7128, longitude: -74.0060 }; // New York
      const point2 = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles

      const distance = geoUtils. calculateDistance(point1, point2);

      expect(distance).toBeGreaterThan(3900000); // ~3936 km
      expect(distance).toBeLessThan(4000000);
    });

    it('should return 0 for same location', () => {
      const point = { latitude: 40.7128, longitude: -74.0060 };

      const distance = geoUtils.calculateDistance(point, point);

      expect(distance).toBe(0);
    });
  });

  describe('isWithinRadius', () => {
    it('should return true if within radius', () => {
      const center = { latitude: 40.7128, longitude: -74.0060 };
      const point = { latitude: 40.7138, longitude: -74.0070 };
      const radius = 200; // 200 meters

      const result = geoUtils.isWithinRadius(center, point, radius);

      expect(result).toBe(true);
    });

    it('should return false if outside radius', () => {
      const center = { latitude: 40.7128, longitude: -74.0060 };
      const point = { latitude: 41.7128, longitude: -74.0060 };
      const radius = 100; // 100 meters

      const result = geoUtils.isWithinRadius(center, point, radius);

      expect(result).toBe(false);
    });
  });

  describe('isValidCoordinates', () => {
    it('should validate correct coordinates', () => {
      const result = geoUtils.isValidCoordinates(40.7128, -74.0060);
      expect(result).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const result = geoUtils.isValidCoordinates(91, -74.0060);
      expect(result).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const result = geoUtils.isValidCoordinates(40.7128, -181);
      expect(result).toBe(false);
    });
  });

  describe('toGeoJSONPoint', () => {
    it('should convert to GeoJSON format', () => {
      const result = geoUtils.toGeoJSONPoint(40.7128, -74.0060);

      expect(result).toEqual({
        type: 'Point',
        coordinates: [-74.0060, 40.7128]
      });
    });
  });
});