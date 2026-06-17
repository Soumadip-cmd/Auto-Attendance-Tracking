import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { APP_CONFIG } from '../constants/config';
import { locationAPI } from './api';
import { calculateDistance } from '../utils/geo';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

class LocationService {
  constructor() {
    this.locationSubscription = null;
    this.currentLocation = null;
    this.isTracking = false;
    this.locationListeners = new Set();
  }

  async requestPermissions(options = {}) {
    const { background = false } = options;
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission denied');
    }

    let backgroundStatus = 'undetermined';
    if (background) {
      const result = await Location.requestBackgroundPermissionsAsync();
      backgroundStatus = result.status;
    }

    return {
      foreground: foregroundStatus === 'granted',
      background: backgroundStatus === 'granted',
    };
  }

  async hasPermissions() {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  async getCurrentLocation() {
    const hasPermission = await this.hasPermissions();

    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    this.currentLocation = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed,
      timestamp: location.timestamp,
      coords: location.coords,
    };

    this.notifyListeners(this.currentLocation);
    return this.currentLocation;
  }

  notifyListeners(location) {
    this.locationListeners.forEach((listener) => {
      try {
        listener(location);
      } catch (error) {
        console.warn('Location listener failed:', error?.message);
      }
    });
  }

  async startTracking(onLocationUpdate) {
    const hasPermission = await this.hasPermissions();

    if (!hasPermission) {
      throw new Error('Location permission not granted');
    }

    if (onLocationUpdate) {
      this.locationListeners.add(onLocationUpdate);
      if (this.currentLocation) {
        onLocationUpdate(this.currentLocation);
      }
    }

    if (this.isTracking && this.locationSubscription) {
      return;
    }

    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 1,
        timeInterval: 1000,
      },
      (location) => {
        this.currentLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          altitude: location.coords.altitude,
          heading: location.coords.heading,
          speed: location.coords.speed,
          timestamp: location.timestamp,
        };

        this.notifyListeners(this.currentLocation);
      }
    );

    this.isTracking = true;
  }

  async stopTracking(onLocationUpdate) {
    if (onLocationUpdate) {
      this.locationListeners.delete(onLocationUpdate);
    } else {
      this.locationListeners.clear();
    }

    if (this.locationListeners.size > 0) {
      return;
    }

    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    this.isTracking = false;
  }

  async startBackgroundTracking() {
    const { background } = await this.requestPermissions({ background: true });

    if (!background) {
      throw new Error('Background location permission not granted');
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: APP_CONFIG.LOCATION_DISTANCE_FILTER,
      timeInterval: APP_CONFIG.BACKGROUND_LOCATION_INTERVAL,
      foregroundService: {
        notificationTitle: 'Attendance Tracker',
        notificationBody: 'Tracking your location for attendance',
        notificationColor: '#6366f1',
      },
    });
  }

  async stopBackgroundTracking() {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);

    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  }

  isWithinGeofence(currentLocation, geofenceCenter, radiusMeters) {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      geofenceCenter.latitude,
      geofenceCenter.longitude
    );

    return distance <= radiusMeters;
  }

  async trackLocation(additionalData = {}) {
    const location = await this.getCurrentLocation();

    const locationData = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: location.altitude,
      heading: location.heading,
      speed: location.speed,
      timestamp: new Date(location.timestamp).toISOString(),
      ...additionalData,
    };

    await locationAPI.track(locationData);
    return locationData;
  }

  async getLocationAddress(latitude, longitude) {
    try {
      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const address = addresses[0];
        return {
          street: address.street,
          city: address.city,
          region: address.region,
          country: address.country,
          postalCode: address.postalCode,
          formattedAddress: `${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`.trim(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting location address:', error);
      return null;
    }
  }
}

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  const locations = data?.locations || [];

  try {
    for (const location of locations) {
      await locationAPI.track({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        timestamp: new Date(location.timestamp).toISOString(),
        isBackground: true,
      });
    }
  } catch (sendError) {
    console.error('Error sending background location:', sendError);
  }
});

export default new LocationService();
