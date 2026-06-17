import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';
import { geofenceAPI, liveTrackingAPI } from './api';
import websocketService from './websocket';
import notificationService from './notificationService';
import * as AndroidGeofencing from 'android-geofencing';

const LIVE_LOCATION_TASK = 'teacher-live-location-updates';
const GEOFENCE_TASK = 'teacher-native-geofence-monitoring';
const TRACKING_SESSION_KEY = '@teacher_live_tracking_session';
const TRACKING_STATS_KEY = '@teacher_live_tracking_stats';
const MAX_ANDROID_GEOFENCES = 100;
const ANDROID_BACKGROUND_PERMISSION_LABEL = 'Allow all the time';

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

const isApproximateLocation = (permission) => (
  permission?.accuracy === 'coarse' ||
  permission?.android?.accuracy === 'coarse' ||
  permission?.ios?.accuracy === 'reduced'
);

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
    this.unsubscribeNativeGeofence = null;
    this.unsubscribeViolation = null;
    this.unsubscribePermissionApproved = null;
    this.unsubscribePermissionRejected = null;
    // Tracks last known transition per geofence — prevents duplicate notifications
    // when GPS oscillates near a boundary (enter→exit→enter in quick succession)
    this._lastGeofenceState = {};
  }

  showBackgroundLocationEducation() {
    if (Platform.OS !== 'android') {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Background Location Needed',
        `GeoAttend needs background location only while Live Tracking is enabled. Android uses it to monitor college geofences when the app is closed and to notify your HOD/admin if you leave the allowed area during attendance time.\n\nOn Android 11 or newer, choose "${ANDROID_BACKGROUND_PERMISSION_LABEL}" from the app location settings screen.`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Continue',
            onPress: () => resolve(true),
          },
        ],
        {
          cancelable: true,
          onDismiss: () => resolve(false),
        }
      );
    });
  }

  showOpenSettingsPrompt() {
    if (Platform.OS !== 'android') {
      return;
    }

    Alert.alert(
      'Enable Background Location',
      `Native geofence monitoring needs background location. Open app settings, tap Location, then choose "${ANDROID_BACKGROUND_PERMISSION_LABEL}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
  }

  async ensurePermissions() {
    let foregroundPermission = await Location.getForegroundPermissionsAsync();

    if (foregroundPermission.status !== 'granted') {
      foregroundPermission = await Location.requestForegroundPermissionsAsync();
    }

    if (foregroundPermission.status !== 'granted') {
      return {
        success: false,
        error: 'Foreground location permission is required for attendance tracking.',
      };
    }

    let backgroundPermission = await Location.getBackgroundPermissionsAsync();

    if (backgroundPermission.status !== 'granted') {
      const shouldContinue = await this.showBackgroundLocationEducation();

      if (!shouldContinue) {
        return {
          success: false,
          declined: true,
          error: 'Background location was not enabled. You can still use the app, but live native geofence monitoring cannot run in the background.',
        };
      }

      backgroundPermission = await Location.requestBackgroundPermissionsAsync();
    }

    if (backgroundPermission.status !== 'granted') {
      this.showOpenSettingsPrompt();

      return {
        success: false,
        needsSettings: true,
        error: `Background location permission is required for native geofence monitoring. Choose "${ANDROID_BACKGROUND_PERMISSION_LABEL}" in app settings.`,
      };
    }

    return {
      success: true,
      warning: isApproximateLocation(foregroundPermission)
        ? 'Approximate location is enabled. Android will also use approximate location in the background, so geofence accuracy can be reduced.'
        : null,
    };
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

    if (Platform.OS === 'android') {
      this.drainPendingGeofenceEvents().catch(() => null);
    }

    return {
      success: true,
      message: 'Teacher live tracking started',
      geofences: geofenceResult.count,
      warning: permissions.warning,
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

    if (Platform.OS === 'android') {
      // Native module uses GeofencingClient + BroadcastReceiver directly.
      // Events are delivered even when the app is killed; persisted in SharedPreferences
      // and drained by drainPendingGeofenceEvents() on next startTracking() call.
      await AndroidGeofencing.removeAllGeofences().catch(() => null);
      if (regions.length > 0) {
        await AndroidGeofencing.addGeofences(regions);
      }
    } else {
      const alreadyStarted = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
      if (alreadyStarted) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK);
      }
      if (regions.length > 0) {
        await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
      }
    }

    await writeStats({ geofences: regions.length });

    return {
      success: true,
      count: regions.length,
      capped: geofences.length > MAX_ANDROID_GEOFENCES,
    };
  }

  async drainPendingGeofenceEvents() {
    const pendingEvents = await AndroidGeofencing.getPendingEvents();
    for (const event of pendingEvents) {
      try {
        await liveTrackingAPI.submitGeofenceEvent({
          geofenceId: event.identifier,
          eventType: event.transitionType,
          latitude: event.latitude,
          longitude: event.longitude,
          timestamp: event.timestamp,
        });
      } catch (e) {
        console.error('Failed to drain pending geofence event:', e);
      }
    }
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

    if (Platform.OS === 'android' && !this.unsubscribeNativeGeofence) {
      this.unsubscribeNativeGeofence = AndroidGeofencing.addTransitionListener(async (event) => {
        const { identifier, transitionType, latitude, longitude, timestamp } = event;

        // Skip if already in this state — native deduplicates too, but JS listener
        // is an extra safety net against rapid GPS oscillation duplicates
        if (this._lastGeofenceState[identifier] === transitionType) return;
        this._lastGeofenceState[identifier] = transitionType;

        const title = transitionType === 'exit' ? 'Outside allowed area' : 'Inside allowed area';
        const body = transitionType === 'exit'
          ? 'Your HOD/admin may be notified if this movement is not approved.'
          : 'Your attendance location is back inside the allowed geofence.';
        await notificationService.scheduleNotification(title, body, {
          type: 'native_geofence',
          eventType: transitionType,
          geofenceId: identifier,
        });
        try {
          await liveTrackingAPI.submitGeofenceEvent({
            geofenceId: identifier,
            eventType: transitionType,
            latitude,
            longitude,
            timestamp,
          });
        } catch (sendError) {
          console.error('Failed to send native geofence event:', sendError);
        }
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

    if (Platform.OS === 'android') {
      await AndroidGeofencing.removeAllGeofences().catch(() => null);
    } else {
      const hasGeofencing = await Location.hasStartedGeofencingAsync(GEOFENCE_TASK);
      if (hasGeofencing) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK);
      }
    }

    if (this.unsubscribeNativeGeofence) {
      this.unsubscribeNativeGeofence.remove();
      this.unsubscribeNativeGeofence = null;
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

    this._lastGeofenceState = {};

    await liveTrackingAPI.stopTracking().catch(() => null);
    await AsyncStorage.removeItem(TRACKING_SESSION_KEY);

    return { success: true };
  }

  async isTracking() {
    const locationUpdates = await Location.hasStartedLocationUpdatesAsync(LIVE_LOCATION_TASK);
    if (Platform.OS === 'android') {
      return locationUpdates || !!this.foregroundSubscription;
    }
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
