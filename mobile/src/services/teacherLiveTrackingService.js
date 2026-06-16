import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { geofenceAPI, liveTrackingAPI } from './api';
import websocketService from './websocket';
import notificationService from './notificationService';

const LIVE_LOCATION_TASK = 'teacher-live-location-updates';
const GEOFENCE_TASK = 'teacher-native-geofence-monitoring';
const TRACKING_SESSION_KEY = '@teacher_live_tracking_session';
const TRACKING_STATS_KEY = '@teacher_live_tracking_stats';
const MAX_ANDROID_GEOFENCES = 100;

const defaultStats = {
  total: 0,
  synced: 0,
  unsynced: 0,
  geofences: 0,
  lastSyncedAt: null,
  newestTimestamp: null,
};

const readStats = async () => {
  const stored = await AsyncStorage.getItem(TRACKING_STATS_KEY);
  return stored ? { ...defaultStats, ...JSON.parse(stored) } : defaultStats;
};

const writeStats = async (patch) => {
  const stats = await readStats();
  const next = { ...stats, ...patch };
  await AsyncStorage.setItem(TRACKING_STATS_KEY, JSON.stringify(next));
  return next;
};

const normalizeLocation = (location, source, trackingSessionId) => ({
  latitude: location.coords.latitude,
  longitude: location.coords.longitude,
  accuracy: location.coords.accuracy,
  altitude: location.coords.altitude,
  heading: location.coords.heading,
  speed: location.coords.speed,
  timestamp: new Date(location.timestamp || Date.now()).toISOString(),
  source,
  trackingSessionId,
});

const sendLiveLocation = async (payload) => {
  try {
    await websocketService.connect();
    const response = await websocketService.sendTeacherLocation(payload);
    if (response?.success) {
      return response;
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('Socket live location failed, using REST fallback:', error.message);
    }
  }

  return liveTrackingAPI.submitLocation(payload);
};

const recordSyncedLocation = async (timestamp) => {
  const stats = await readStats();
  await writeStats({
    total: stats.total + 1,
    synced: stats.synced + 1,
    lastSyncedAt: new Date().toISOString(),
    newestTimestamp: timestamp,
  });
};

const recordUnsyncedLocation = async (timestamp) => {
  const stats = await readStats();
  await writeStats({
    total: stats.total + 1,
    unsynced: stats.unsynced + 1,
    newestTimestamp: timestamp,
  });
};

TaskManager.defineTask(LIVE_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Live location background task error:', error);
    return;
  }

  const locations = data?.locations || [];
  if (locations.length === 0) return;

  const trackingSessionId = await AsyncStorage.getItem(TRACKING_SESSION_KEY);

  for (const location of locations) {
    const payload = normalizeLocation(location, 'background', trackingSessionId);
    try {
      await sendLiveLocation(payload);
      await recordSyncedLocation(payload.timestamp);
    } catch (sendError) {
      console.error('Failed to sync background live location:', sendError);
      await recordUnsyncedLocation(payload.timestamp);
    }
  }
});

TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Native geofence task error:', error);
    return;
  }

  const eventType = data?.eventType === Location.GeofencingEventType.Exit ? 'exit' : 'enter';
  const region = data?.region;
  if (!region) return;

  const title = eventType === 'exit' ? 'Outside allowed area' : 'Inside allowed area';
  const body = eventType === 'exit'
    ? 'Your HOD/admin may be notified if this movement is not approved.'
    : 'Your attendance location is back inside the allowed geofence.';

  await notificationService.scheduleNotification(title, body, {
    type: 'native_geofence',
    eventType,
    geofenceId: region.identifier,
  });

  try {
    await liveTrackingAPI.submitGeofenceEvent({
      geofenceId: region.identifier,
      eventType,
      latitude: region.latitude,
      longitude: region.longitude,
      timestamp: new Date().toISOString(),
    });
  } catch (sendError) {
    console.error('Failed to send native geofence event:', sendError);
  }
});

class TeacherLiveTrackingService {
  constructor() {
    this.foregroundSubscription = null;
    this.unsubscribeViolation = null;
    this.unsubscribePermissionApproved = null;
    this.unsubscribePermissionRejected = null;
  }

  async ensurePermissions() {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      return {
        success: false,
        error: 'Foreground location permission is required for attendance tracking.',
      };
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      return {
        success: false,
        error: 'Background location permission is required for geofence monitoring.',
      };
    }

    return { success: true };
  }

  async startTracking() {
    const permissions = await this.ensurePermissions();
    if (!permissions.success) return permissions;

    await notificationService.configureChannel();
    await notificationService.requestPermissions();

    const trackingSessionId = `${Date.now()}`;
    await AsyncStorage.setItem(TRACKING_SESSION_KEY, trackingSessionId);
    await writeStats({ ...defaultStats, lastSyncedAt: null });

    await websocketService.connect();
    this.subscribeToServerEvents();
    await this.startForegroundWatch(trackingSessionId);
    await this.startBackgroundUpdates();
    const geofenceResult = await this.startNativeGeofenceMonitoring();

    return {
      success: true,
      message: 'Teacher live tracking started',
      geofences: geofenceResult.count,
    };
  }

  async startForegroundWatch(trackingSessionId) {
    if (this.foregroundSubscription) return;

    this.foregroundSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 5000,
      },
      async (location) => {
        const payload = normalizeLocation(location, 'foreground', trackingSessionId);

        try {
          await sendLiveLocation(payload);
          await recordSyncedLocation(payload.timestamp);
        } catch (error) {
          console.error('Failed to send foreground live location:', error);
          await recordUnsyncedLocation(payload.timestamp);
        }
      }
    );
  }

  async startBackgroundUpdates() {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(LIVE_LOCATION_TASK);
    if (hasStarted) return;

    await Location.startLocationUpdatesAsync(LIVE_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      distanceInterval: 15,
      timeInterval: 15000,
      deferredUpdatesInterval: 10000,
      foregroundService: {
        notificationTitle: 'Attendance live tracking active',
        notificationBody: 'Recording location for geofence attendance.',
        notificationColor: '#2563eb',
        killServiceOnDestroy: false,
      },
      activityType: Location.ActivityType.Other,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
    });
  }

  async startNativeGeofenceMonitoring() {
    const response = await geofenceAPI.getAll({ isActive: true });
    const geofences = response?.data || [];
    const regions = geofences
      .filter((geofence) => geofence.center?.coordinates?.length === 2)
      .slice(0, MAX_ANDROID_GEOFENCES)
      .map((geofence) => ({
        identifier: geofence._id,
        latitude: geofence.center.coordinates[1],
        longitude: geofence.center.coordinates[0],
        radius: Math.max(10, Number(geofence.radius) || 100),
        notifyOnEnter: true,
        notifyOnExit: true,
      }));

    const alreadyStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    if (alreadyStarted) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }

    if (regions.length > 0) {
      await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
    }

    await writeStats({ geofences: regions.length });

    return {
      success: true,
      count: regions.length,
      capped: geofences.length > MAX_ANDROID_GEOFENCES,
    };
  }

  subscribeToServerEvents() {
    if (!this.unsubscribeViolation) {
      this.unsubscribeViolation = websocketService.on('teacher:geofence:violation', async (data) => {
        await notificationService.scheduleNotification(
          'Outside assigned geofence',
          data?.message || 'Your current location is outside your allowed area.',
          { type: 'geofence_violation' }
        );
      });
    }

    if (!this.unsubscribePermissionApproved) {
      this.unsubscribePermissionApproved = websocketService.on('movement-permission:approved', async (data) => {
        await notificationService.scheduleNotification(
          'Movement permission approved',
          `Access allowed until ${new Date(data.endTime).toLocaleTimeString()}`,
          { type: 'movement_permission_approved', id: data.id }
        );
      });
    }

    if (!this.unsubscribePermissionRejected) {
      this.unsubscribePermissionRejected = websocketService.on('movement-permission:rejected', async () => {
        await notificationService.scheduleNotification(
          'Movement permission rejected',
          'Your movement request was not approved.',
          { type: 'movement_permission_rejected' }
        );
      });
    }
  }

  async stopTracking() {
    if (this.foregroundSubscription) {
      this.foregroundSubscription.remove();
      this.foregroundSubscription = null;
    }

    const hasLocationUpdates = await Location.hasStartedLocationUpdatesAsync(LIVE_LOCATION_TASK);
    if (hasLocationUpdates) {
      await Location.stopLocationUpdatesAsync(LIVE_LOCATION_TASK);
    }

    const hasGeofencing = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    if (hasGeofencing) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK);
    }

    if (this.unsubscribeViolation) {
      this.unsubscribeViolation();
      this.unsubscribeViolation = null;
    }
    if (this.unsubscribePermissionApproved) {
      this.unsubscribePermissionApproved();
      this.unsubscribePermissionApproved = null;
    }
    if (this.unsubscribePermissionRejected) {
      this.unsubscribePermissionRejected();
      this.unsubscribePermissionRejected = null;
    }

    await liveTrackingAPI.stopTracking().catch(() => null);
    await AsyncStorage.removeItem(TRACKING_SESSION_KEY);

    return { success: true };
  }

  async isTracking() {
    const locationUpdates = await Location.hasStartedLocationUpdatesAsync(LIVE_LOCATION_TASK);
    const geofencing = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
    return locationUpdates || geofencing || !!this.foregroundSubscription;
  }

  async getStats() {
    return readStats();
  }

  async refreshGeofences() {
    return this.startNativeGeofenceMonitoring();
  }

  async clearHistory() {
    await AsyncStorage.removeItem(TRACKING_STATS_KEY);
  }
}

export default new TeacherLiveTrackingService();
