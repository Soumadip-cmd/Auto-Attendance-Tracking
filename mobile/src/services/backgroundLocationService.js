import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { locationAPI } from './api';

const BACKGROUND_TASK = 'background-location-tracking';
const OFFLINE_STORAGE_KEY = '@location_history_offline';
const MAX_OFFLINE_LOCATIONS = 2000;

// Background task definition - MUST be at top level
TaskManager.defineTask(BACKGROUND_TASK, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background task error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    console.log(`📍 BACKGROUND: Received ${locations.length} location updates`);
    
    for (const location of locations) {
      console.log(`  ├─ Lat: ${location.coords.latitude.toFixed(6)}`);
      console.log(`  ├─ Lng: ${location.coords.longitude.toFixed(6)}`);
      console.log(`  ├─ Accuracy: ${location.coords.accuracy.toFixed(1)}m`);
      console.log(`  ├─ Speed: ${location.coords.speed ? (location.coords.speed * 3.6).toFixed(1) + ' km/h' : 'N/A'}`);
      console.log(`  └─ Time: ${new Date(location.timestamp).toLocaleTimeString()}`);
    }

    // Store offline
    await BackgroundLocationService.storeOffline(locations);
    
    // Try to sync
    await BackgroundLocationService.syncToServer();
  }
});

class BackgroundLocationService {
  /**
   * Start background location tracking
   */
  static async startTracking() {
    try {
      console.log('🚀 Starting background location tracking...');

      // Check permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('❌ Foreground location permission required');
        return { success: false, error: 'Foreground permission denied' };
      }

      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.error('⚠️ Background location permission denied - limited functionality');
      }

      // Check if already running
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK);
      if (hasStarted) {
        console.log('✅ Background tracking already active');
        return { success: true, message: 'Already tracking' };
      }

      // Start background tracking
      await Location.startLocationUpdatesAsync(BACKGROUND_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 10, // Track every 10 meters (captures ~2 steps)
        timeInterval: 10000, // Or every 10 seconds
        deferredUpdatesInterval: 5000, // Batch updates every 5 seconds
        foregroundService: {
          notificationTitle: '📍 Attendance Tracking Active',
          notificationBody: 'Recording location for automatic attendance',
          notificationColor: '#6366f1',
          killServiceOnDestroy: false, // Keep running when app is killed
        },
        activityType: Location.ActivityType.Other, // Changed from Fitness for better persistence
        showsBackgroundLocationIndicator: true,
        pausesUpdatesAutomatically: false, // Keep tracking even if stationary
      });

      console.log('✅ Background tracking started!');
      console.log('   📏 Distance: Updates every 10 meters');
      console.log('   ⏱️  Time: Updates every 10 seconds');
      console.log('   🚶 Activity: Optimized for walking');
      console.log('   🔋 Even works when app is closed');

      return { success: true, message: 'Background tracking started' };
    } catch (error) {
      console.error('❌ Error starting background tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop background tracking
   */
  static async stopTracking() {
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_TASK);
        console.log('🛑 Background tracking stopped');
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Error stopping tracking:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if tracking is active
   */
  static async isTracking() {
    try {
      return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_TASK);
    } catch (error) {
      return false;
    }
  }

  /**
   * Store locations offline
   */
  static async storeOffline(locations) {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      const history = stored ? JSON.parse(stored) : [];

      locations.forEach(loc => {
        history.push({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          altitude: loc.coords.altitude,
          speed: loc.coords.speed,
          heading: loc.coords.heading,
          timestamp: loc.timestamp,
          synced: false,
        });
      });

      // Keep only recent locations
      const trimmed = history.slice(-MAX_OFFLINE_LOCATIONS);
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(trimmed));

      console.log(`💾 Stored ${locations.length} locations (Total: ${trimmed.length})`);
    } catch (error) {
      console.error('❌ Error storing offline:', error);
    }
  }

  /**
   * Sync to server
   */
  static async syncToServer() {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!stored) return;

      const history = JSON.parse(stored);
      const unsynced = history.filter(loc => !loc.synced);

      if (unsynced.length === 0) {
        console.log('✅ All locations synced');
        return;
      }

      console.log(`🔄 Syncing ${unsynced.length} locations...`);

      // Batch sync (50 at a time)
      const batchSize = 50;
      let synced = 0;

      for (let i = 0; i < unsynced.length; i += batchSize) {
        const batch = unsynced.slice(i, i + batchSize);

        try {
          await locationAPI.submitBatch(batch.map(loc => ({
            latitude: loc.latitude,
            longitude: loc.longitude,
            accuracy: loc.accuracy,
            altitude: loc.altitude,
            speed: loc.speed,
            heading: loc.heading,
            timestamp: new Date(loc.timestamp).toISOString(),
            trackingType: 'background',
          })));

          // Mark as synced
          batch.forEach(loc => loc.synced = true);
          synced += batch.length;
          
          console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} locations`);
        } catch (error) {
          console.error(`   ✗ Batch ${Math.floor(i / batchSize) + 1} failed:`, error.message);
          break; // Stop on first error
        }
      }

      // Save updated history
      await AsyncStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(history));
      console.log(`✅ Synced ${synced}/${unsynced.length} locations`);
    } catch (error) {
      console.error('❌ Sync error:', error);
    }
  }

  /**
   * Get offline history
   */
  static async getOfflineHistory() {
    try {
      const stored = await AsyncStorage.getItem(OFFLINE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting history:', error);
      return [];
    }
  }

  /**
   * Get tracking statistics
   */
  static async getStats() {
    try {
      const history = await this.getOfflineHistory();
      const unsynced = history.filter(loc => !loc.synced).length;
      const synced = history.length - unsynced;

      return {
        total: history.length,
        synced,
        unsynced,
        oldestTimestamp: history.length > 0 ? history[0].timestamp : null,
        newestTimestamp: history.length > 0 ? history[history.length - 1].timestamp : null,
      };
    } catch (error) {
      return { total: 0, synced: 0, unsynced: 0 };
    }
  }

  /**
   * Clear offline history
   */
  static async clearHistory() {
    try {
      await AsyncStorage.removeItem(OFFLINE_STORAGE_KEY);
      console.log('🗑️ Offline history cleared');
    } catch (error) {
      console.error('❌ Error clearing history:', error);
    }
  }
}

export default BackgroundLocationService;
