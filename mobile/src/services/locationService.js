import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationAPI } from './api';
import { generateLocationSignature } from '../utils/security';

const LOCATION_TASK_NAME = 'background-location-task';
const LOCATION_CACHE_KEY = 'cached_locations';

// Define background location task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    console.log('Background location update:', locations);

    // Cache locations for later sync
    await cacheLocations(locations);
    
    // Try to sync if online
    await syncCachedLocations();
  }
});

// Cache locations for offline sync
const cacheLocations = async (locations) => {
  try {
    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    const cachedLocations = cached ? JSON.parse(cached) : [];
    
    const deviceId = await Device.getDeviceId();
    const batteryLevel = await Battery.getBatteryLevelAsync();
    const networkState = await Network.getNetworkStateAsync();

    const enrichedLocations = locations.map(loc => ({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
      altitude: loc.coords.altitude,
      altitudeAccuracy: loc.coords.altitudeAccuracy,
      heading: loc.coords.heading,
      speed: loc.coords.speed,
      timestamp: loc.timestamp,
      trackingType: 'background',
      batteryLevel: Math.round(batteryLevel * 100),
      networkType: networkState.isConnected ? (networkState.type === 'WIFI' ? 'wifi' : 'cellular') : 'none',
      signature: generateLocationSignature(
        loc.coords.longitude,
        loc.coords.latitude,
        loc.timestamp
      )
    }));

    cachedLocations.push(...enrichedLocations);
    
    // Limit cache size
    const limitedCache = cachedLocations.slice(-100); // Keep last 100 locations
    
    await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(limitedCache));
  } catch (error) {
    console.error('Error caching locations:', error);
  }
};

// Sync cached locations to server
const syncCachedLocations = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    if (!networkState.isConnected) {
      return;
    }

    const cached = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return;

    const locations = JSON.parse(cached);
    if (locations.length === 0) return;

    const deviceId = await Device.getDeviceId();

    // Send in batches of 50
    const batchSize = 50;
    for (let i = 0; i < locations.length; i += batchSize) {
      const batch = locations.slice(i, i + batchSize);
      
      try {
        await locationAPI.submitBatch(batch, deviceId);
        
        // Remove synced locations from cache
        const remaining = locations.slice(i + batchSize);
        await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(remaining));
      } catch (error) {
        console.error('Error syncing location batch:', error);
        break; // Stop if sync fails
      }
    }
  } catch (error) {
    console.error('Error syncing cached locations:', error);
  }
};

// Location service class
class LocationService {
  constructor() {
    this.isTracking = false;
    this.foregroundSubscription = null;
  }

  // Request location permissions
  async requestPermissions() {
    try {
      // Request foreground permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        throw new Error('Foreground location permission denied');
      }

      // Request background permission (if needed)
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      return {
        foreground: foregroundStatus === 'granted',
        background: backgroundStatus === 'granted'
      };
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      throw error;
    }
  }

  // Check if permissions are granted
  async checkPermissions() {
    const { status: foregroundStatus } = await Location.getForegroundPermissionsAsync();
    const { status: backgroundStatus } = await Location.getBackgroundPermissionsAsync();
    
    return {
      foreground: foregroundStatus === 'granted',
      background: backgroundStatus === 'granted'
    };
  }

  // Start foreground location tracking
  async startForegroundTracking(callback) {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.foreground) {
        throw new Error('Foreground location permission not granted');
      }

      this.foregroundSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 300000, // 5 minutes
          distanceInterval: 50, // 50 meters
        },
        async (location) => {
          console.log('Foreground location update:', location);
          
          // Enrich location data
          const deviceId = await Device.getDeviceId();
          const batteryLevel = await Battery.getBatteryLevelAsync();
          const networkState = await Network.getNetworkStateAsync();

          const enrichedLocation = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
            altitude: location.coords.altitude,
            altitudeAccuracy: location.coords.altitudeAccuracy,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
            trackingType: 'foreground',
            batteryLevel: Math.round(batteryLevel * 100),
            networkType: networkState.isConnected ? (networkState.type === 'WIFI' ? 'wifi' : 'cellular') : 'none',
            deviceId,
            signature: generateLocationSignature(
              location.coords.longitude,
              location.coords.latitude,
              location.timestamp
            )
          };

          // Submit to server
          try {
            await locationAPI.submit(enrichedLocation);
            if (callback) callback(enrichedLocation);
          } catch (error) {
            console.error('Error submitting location:', error);
            // Cache for later sync
            await cacheLocations([location]);
          }
        }
      );

      this.isTracking = true;
    } catch (error) {
      console.error('Error starting foreground tracking:', error);
      throw error;
    }
  }

  // Stop foreground location tracking
  async stopForegroundTracking() {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
      this.isTracking = false;
    }
  }

  // Start background location tracking
  async startBackgroundTracking() {
    try {
      const permissions = await this.checkPermissions();
      if (!permissions.background) {
        throw new Error('Background location permission not granted');
      }

      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_TASK_NAME);
      if (!isTaskDefined) {
        console.warn('Background location task not defined');
        return;
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 300000, // 5 minutes
        distanceInterval: 50, // 50 meters
        foregroundService: {
          notificationTitle: 'Auto Attendance',
          notificationBody: 'Tracking your location for attendance',
          notificationColor: '#3B82F6',
        },
        pausesUpdatesAutomatically: true,
        activityType: Location.ActivityType.Other,
      });

      this.isTracking = true;
    } catch (error) {
      console.error('Error starting background tracking:', error);
      throw error;
    }
  }

  // Stop background location tracking
  async stopBackgroundTracking() {
    try {
      const isTaskRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
      if (isTaskRegistered) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
      this.isTracking = false;
    } catch (error) {
      console.error('Error stopping background tracking:', error);
    }
  }

  // Get current location
  async getCurrentLocation() {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      throw error;
    }
  }

  // Sync cached locations
  async syncCached() {
    return syncCachedLocations();
  }
}

export default new LocationService();
