import { useState, useEffect, useCallback, useRef } from 'react';
import locationService from '../services/locationService';

export const useLocation = () => {
  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const trackingCallbackRef = useRef(null);
  const externalUpdateRef = useRef(null);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();

    return () => {
      if (trackingCallbackRef.current) {
        locationService.stopTracking(trackingCallbackRef.current).catch(() => {});
        trackingCallbackRef.current = null;
      }
    };
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

  const requestPermissions = async (options) => {
    try {
      setIsLoading(true);
      const permissions = await locationService.requestPermissions(options);
      setHasPermission(permissions.foreground);
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
      setError(err.message);
      setIsLoading(false);
      return null;
    }
  }, []);

  const startTracking = useCallback(async (onLocationUpdate) => {
    try {
      setError(null);
      externalUpdateRef.current = onLocationUpdate;

      if (!trackingCallbackRef.current) {
        trackingCallbackRef.current = (newLocation) => {
          setLocation(newLocation);
          if (externalUpdateRef.current) {
            externalUpdateRef.current(newLocation);
          }
        };
      }

      await locationService.startTracking(trackingCallbackRef.current);
      setIsTracking(true);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const stopTracking = useCallback(async () => {
    try {
      if (trackingCallbackRef.current) {
        await locationService.stopTracking(trackingCallbackRef.current);
        trackingCallbackRef.current = null;
      }
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
