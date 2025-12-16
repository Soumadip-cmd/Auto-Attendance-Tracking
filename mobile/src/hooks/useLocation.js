import { useState, useEffect, useCallback } from 'react';
import locationService from '../services/locationService';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const granted = await locationService.hasPermissions();
      setHasPermission(granted);
      return granted;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const requestPermissions = async () => {
    try {
      setIsLoading(true);
      const permissions = await locationService.requestPermissions();
      setHasPermission(permissions. foreground);
      setIsLoading(false);
      return permissions;
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return null;
    }
  };

  const getCurrentLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const loc = await locationService.getCurrentLocation();
      setLocation(loc);
      setIsLoading(false);
      return loc;
    } catch (err) {
      setError(err. message);
      setIsLoading(false);
      return null;
    }
  }, []);

  const startTracking = useCallback(async () => {
    try {
      setError(null);
      await locationService.startTracking((newLocation) => {
        setLocation(newLocation);
      });
      setIsTracking(true);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const stopTracking = useCallback(async () => {
    try {
      await locationService.stopTracking();
      setIsTracking(false);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const isWithinGeofence = useCallback((geofenceCenter, radiusMeters) => {
    if (!location) return false;
    return locationService.isWithinGeofence(location, geofenceCenter, radiusMeters);
  }, [location]);

  return {
    location,
    isTracking,
    hasPermission,
    isLoading,
    error,
    getCurrentLocation,
    startTracking,
    stopTracking,
    requestPermissions,
    checkPermissions,
    isWithinGeofence,
  };
};