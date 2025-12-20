import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { APP_CONFIG } from '../constants/config';
import { locationAPI } from './api';
import { calculateDistance } from '../utils/geo';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

class LocationService {
  constructor() {
    this.locationSubscription = null;
    this. currentLocation = null;
    this. isTracking = false;
  }

  /**
   * Request location permissions
   */
  async requestPermissions() {
    try {
      console.log('📍 Requesting location permissions...');
      
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      console.log('  ├─ Foreground permission:', foregroundStatus);
      
      if (foregroundStatus !== 'granted') {
        console.error('❌ Foreground location permission denied');
        throw new Error('Foreground location permission denied');
      }

      // Request background permissions (optional)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      console.log('  └─ Background permission:', backgroundStatus);
      
      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted',
      };
    } catch (error) {
      console.error('❌ Error requesting location permissions:', error);
      throw error;
    }
  }

  /**
   * Check if location permissions are granted
   */
  async hasPermissions() {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get current location (one-time)
   */
  async getCurrentLocation() {
    try {
      const hasPermission = await this.hasPermissions();
      
      if (!hasPermission) {
        console.error('❌ Location permission not granted');
        throw new Error('Location permission not granted');
      }

      console.log('📍 Getting current location with HIGH accuracy...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('📍 Raw Location Object:', JSON.stringify(location, null, 2));

      this.currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: location.timestamp,
        coords: location.coords, // Keep full coords object
      };

      console.log('✅ Location obtained:');
      console.log('  ├─ Latitude:', this.currentLocation.latitude);
      console.log('  ├─ Longitude:', this.currentLocation.longitude);
      console.log('  ├─ Accuracy:', this.currentLocation.accuracy, 'm');
      console.log('  ├─ Altitude:', this.currentLocation.altitude);
      console.log('  ├─ Speed:', this.currentLocation.speed);
      console.log('  ├─ Heading:', this.currentLocation.heading);
      console.log('  └─ Timestamp:', new Date(this.currentLocation.timestamp).toLocaleString());

      return this.currentLocation;
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      throw error;
    }
  }

  /**
   * Start tracking location (foreground)
   */
  async startTracking(onLocationUpdate) {
    try {
      const hasPermission = await this.hasPermissions();
      
      if (! hasPermission) {
        throw new Error('Location permission not granted');
      }

      if (this.isTracking) {
        console.warn('Location tracking already started');
        return;
      }

      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 5, // Update every 5 meters
          timeInterval: 3000, // 3 seconds for smoother tracking
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

          if (onLocationUpdate) {
            onLocationUpdate(this.currentLocation);
          }
        }
      );

      this.isTracking = true;
      console. log('✅ Location tracking started');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  async stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      this.isTracking = false;
      console.log('🛑 Location tracking stopped');
    }
  }

  /**
   * Start background location tracking (use BackgroundLocationService instead)
   */
  async startBackgroundTracking() {
    try {
      const { background } = await this.requestPermissions();
      
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

      console.log('✅ Background location tracking started');
    } catch (error) {
      console.error('Error starting background tracking:', error);
      throw error;
    }
  }

  /**
   * Stop background location tracking
   */
  async stopBackgroundTracking() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK);
      
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        console.log('🛑 Background location tracking stopped');
      }
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  }

  /**
   * Check if location is within geofence
   */
  isWithinGeofence(currentLocation, geofenceCenter, radiusMeters) {
    const distance = calculateDistance(
      currentLocation. latitude,
      currentLocation.longitude,
      geofenceCenter. latitude,
      geofenceCenter.longitude
    );

    return distance <= radiusMeters;
  }

  /**
   * Send location to backend
   */
  async trackLocation(additionalData = {}) {
    try {
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
    } catch (error) {
      console.error('Error tracking location:', error);
      throw error;
    }
  }

  /**
   * Get location address (reverse geocoding)
   */
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
          formattedAddress: `${address.street || ''}, ${address.city || ''}, ${address.region || ''} ${address.postalCode || ''}`,
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting location address:', error);
      return null;
    }
  }
}

// Define background location task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    
    // Send locations to backend
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
    } catch (error) {
      console.error('Error sending background location:', error);
    }
  }
});

export default new LocationService();