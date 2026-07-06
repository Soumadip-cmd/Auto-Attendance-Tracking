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
const LAST_AUTO_EVENT_KEY = '@teacher_last_auto_attendance_event';
const MAX_ANDROID_GEOFENCES = 100;
const ANDROID_BACKGROUND_PERMISSION_LABEL = 'Allow all the time';

// Persists the outcome of the most recent auto check-in/out attempt so the
// Home screen can show *why* it did or didn't happen — until now, a "skipped"
// response (wrong geofence config, already checked in, etc.) was silently
// discarded and the user only ever saw a generic "Campus Entered" notice.
const recordAutoAttendanceEvent = async ({ eventType, geofenceId, timestamp, result, error }) => {
  const attendance = result?.attendance;
  const entry = {
    eventType,
    geofenceId,
    timestamp: timestamp || new Date().toISOString(),
    recordedAt: new Date().toISOString(),
    success: !error && !!attendance && !attendance.skipped,
    skipped: !!attendance?.skipped,
    reason: attendance?.reason || error?.message || null,
  };
  console.log('[AutoAttendance]', eventType, geofenceId, '->', entry.success ? 'RECORDED' : entry.skipped ? `SKIPPED (${entry.reason})` : `FAILED (${entry.reason})`);
  try {
    await AsyncStorage.setItem(LAST_AUTO_EVENT_KEY, JSON.stringify(entry));
  } catch (e) {
    console.error('Failed to persist last auto attendance event:', e);
  }
  return entry;
};

const makeGeofenceEventId = (identifier, transitionType, timestamp) =>
  `${identifier}:${transitionType}:${timestamp || new Date().toISOString()}`;

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

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
  const timestamp = new Date().toISOString();
  const eventId = makeGeofenceEventId(region.identifier, eventType, timestamp);

  await notificationService.scheduleNotification(title, body, {
    type: 'native_geofence',
    eventType,
    geofenceId: region.identifier,
    eventId,
  });

  try {
    const result = await liveTrackingAPI.submitGeofenceEvent({
      geofenceId: region.identifier,
      eventType,
      latitude: region.latitude,
      longitude: region.longitude,
      timestamp,
      eventId,
    });
    await recordAutoAttendanceEvent({ eventType, geofenceId: region.identifier, timestamp, result });
  } catch (sendError) {
    console.error('Failed to send native geofence event:', sendError);
    await recordAutoAttendanceEvent({ eventType, geofenceId: region.identifier, timestamp, error: sendError });
  }
});

class TeacherLiveTrackingService {
  constructor() {
    this.foregroundSubscription = null;
    this.unsubscribeNativeGeofence = null;
    this.unsubscribeViolation = null;
    this.unsubscribePermissionApproved = null;
    this.unsubscribePermissionRejected = null;
    this._lastGeofenceState = {};
    // Movement-permission monitoring state
    this._activePermission = null;        // currently active approved permission
    this._permViolationSent = false;      // fired violation once; reset on re-enter
    this._permExpiryAlerted = false;      // fired 10-min expiry warning once
    this._permCheckInterval = null;       // setInterval handle
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
        error: 'Location permission is required. Please allow location access to enable live tracking.',
      };
    }

    // Background permission is OPTIONAL — tracking works in foreground-only mode without it
    const backgroundPermission = await Location.getBackgroundPermissionsAsync();
    const hasBackground = backgroundPermission.status === 'granted';

    if (!hasBackground) {
      // Silently return foreground-only mode; don't block the user
      return {
        success: true,
        foregroundOnly: true,
        warning: 'Background location not enabled. Tracking works while the app is open. To track in background, go to Settings → Location → Allow all the time.',
      };
    }

    return {
      success: true,
      foregroundOnly: false,
      warning: isApproximateLocation(foregroundPermission)
        ? 'Approximate location is enabled. Geofence accuracy may be reduced.'
        : null,
    };
  }

  async startTracking() {
    const alreadyTracking = await this.isTracking().catch(() => !!this.foregroundSubscription);
    if (alreadyTracking) {
      await websocketService.connect();
      this.subscribeToServerEvents();
      this._startPermissionMonitor();
      return {
        success: true,
        alreadyTracking: true,
        message: 'Teacher live tracking already active',
      };
    }

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

    let geofenceCount = 0;
    if (!permissions.foregroundOnly) {
      // Full background tracking — start background updates and native geofences
      await this.startBackgroundUpdates();
      const geofenceResult = await this.startNativeGeofenceMonitoring();
      geofenceCount = geofenceResult?.count ?? 0;
      if (Platform.OS === 'android') {
        this.drainPendingGeofenceEvents().catch(() => null);
      }
    }

    this._startPermissionMonitor();

    return {
      success: true,
      message: permissions.foregroundOnly
        ? 'Live tracking started (foreground mode — open app for tracking)'
        : 'Teacher live tracking started',
      geofences: geofenceCount,
      foregroundOnly: permissions.foregroundOnly,
      warning: permissions.warning,
    };
  }

  // ── Movement-Permission monitoring ─────────────────────────────────────────

  async _fetchActivePermission() {
    try {
      const res = await liveTrackingAPI.getActivePermission?.();
      this._activePermission = res?.data?.data || null;
    } catch {
      this._activePermission = null;
    }
  }

  _checkPermissionViolation(lat, lon) {
    const p = this._activePermission;
    if (!p) return;

    const now = Date.now();
    const endMs = new Date(p.endTime).getTime();
    if (now > endMs) {
      // Permission expired — clear and alert
      if (!this._permExpiryAlerted) {
        this._permExpiryAlerted = true;
        notificationService.scheduleNotification(
          'Movement permission expired',
          'Your temporary access window has ended. Please return to campus.',
          { type: 'permission_expired' }
        ).catch(() => null);
      }
      this._activePermission = null;
      this._permViolationSent = false;
      this._permExpiryAlerted = false;
      return;
    }

    // Warn 10 minutes before expiry
    const minsLeft = (endMs - now) / 60000;
    if (minsLeft <= 10 && !this._permExpiryAlerted) {
      this._permExpiryAlerted = true;
      notificationService.scheduleNotification(
        'Permission expires soon',
        `Your movement permission expires in ${Math.ceil(minsLeft)} minutes.`,
        { type: 'permission_expiring' }
      ).catch(() => null);
    }

    const [lng, lt] = p.allowedLocation.coordinates;
    const dist = haversineMeters(lat, lon, lt, lng);
    const isOutside = dist > p.radius;

    if (isOutside && !this._permViolationSent) {
      this._permViolationSent = true;
      notificationService.scheduleNotification(
        'Outside approved zone',
        `You have moved ${Math.round(dist - p.radius)}m outside your approved location.`,
        { type: 'permission_violation' }
      ).catch(() => null);
      // Report violation to server
      liveTrackingAPI.submitGeofenceEvent?.({
        geofenceId: p._id,
        eventType: 'exit',
        latitude: lat,
        longitude: lon,
        timestamp: new Date().toISOString(),
        isPermissionViolation: true,
      }).catch(() => null);
    } else if (!isOutside && this._permViolationSent) {
      // Back inside the approved zone
      this._permViolationSent = false;
      notificationService.scheduleNotification(
        'Back inside approved zone',
        'You are back within your approved movement area.',
        { type: 'permission_violation_cleared' }
      ).catch(() => null);
    }
  }

  _startPermissionMonitor() {
    if (this._permCheckInterval) return;

    this._fetchActivePermission();
    // Refresh active permission every 2 minutes
    this._permCheckInterval = setInterval(() => {
      this._fetchActivePermission();
    }, 2 * 60 * 1000);
  }

  _stopPermissionMonitor() {
    if (this._permCheckInterval) {
      clearInterval(this._permCheckInterval);
      this._permCheckInterval = null;
    }
    this._activePermission = null;
    this._permViolationSent = false;
    this._permExpiryAlerted = false;
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

        // Check movement-permission zone compliance on every update
        this._checkPermissionViolation(payload.latitude, payload.longitude);

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
    const response = await geofenceAPI.getAll({ isActive: true, mine: true });
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
      const eventId = makeGeofenceEventId(event.identifier, event.transitionType, event.timestamp);
      let result = null;
      try {
        result = await liveTrackingAPI.submitGeofenceEvent({
          geofenceId: event.identifier,
          eventType: event.transitionType,
          latitude: event.latitude,
          longitude: event.longitude,
          timestamp: event.timestamp,
          eventId,
        });
        await recordAutoAttendanceEvent({ eventType: event.transitionType, geofenceId: event.identifier, timestamp: event.timestamp, result });
      } catch (e) {
        console.error('Failed to drain pending geofence event:', e);
        await recordAutoAttendanceEvent({ eventType: event.transitionType, geofenceId: event.identifier, timestamp: event.timestamp, error: e });
        continue;
      }

      const attendance = result?.attendance;
      if (attendance && !attendance.skipped) {
        const isEnter = event.transitionType === 'enter';
        await notificationService.scheduleNotification(
          isEnter ? 'Auto Check-In (Restored)' : 'Auto Check-Out (Restored)',
          `${isEnter ? 'Campus entry' : 'Campus exit'} at ${new Date(event.timestamp || Date.now()).toLocaleTimeString()} has been recorded.`,
          { type: isEnter ? 'auto_checkin' : 'auto_checkout', geofenceId: event.identifier, eventId }
        );
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
        const eventId = makeGeofenceEventId(identifier, transitionType, timestamp);

        // Skip if already in this state — extra JS-side dedup on top of native dedup
        if (this._lastGeofenceState[identifier] === transitionType) return;
        this._lastGeofenceState[identifier] = transitionType;

        // Submit to live-tracking backend
        let result = null;
        try {
          result = await liveTrackingAPI.submitGeofenceEvent({
            geofenceId: identifier,
            eventType: transitionType,
            latitude,
            longitude,
            timestamp,
            eventId,
          });
          await recordAutoAttendanceEvent({ eventType: transitionType, geofenceId: identifier, timestamp, result });
        } catch (sendError) {
          console.error('Failed to send native geofence event:', sendError);
          await recordAutoAttendanceEvent({ eventType: transitionType, geofenceId: identifier, timestamp, error: sendError });
          return;
        }

        const attendance = result?.attendance;
        if (transitionType === 'enter') {
          if (attendance && !attendance.skipped) {
            await notificationService.scheduleNotification(
              'Auto Check-In',
              `You've entered campus. Checked in at ${new Date(timestamp || Date.now()).toLocaleTimeString()}.`,
              { type: 'auto_checkin', geofenceId: identifier, eventId }
            );
          } else {
            await notificationService.scheduleNotification(
              'Campus Entered',
              'You are inside the campus geofence.',
              { type: 'geofence_enter', geofenceId: identifier, eventId }
            );
          }
        } else if (transitionType === 'exit') {
          if (attendance && !attendance.skipped) {
            await notificationService.scheduleNotification(
              'Auto Check-Out',
              `You've left campus. Checked out at ${new Date(timestamp || Date.now()).toLocaleTimeString()}.`,
              { type: 'auto_checkout', geofenceId: identifier, eventId }
            );
          } else {
            await notificationService.scheduleNotification(
              'Campus Exited',
              'You are outside the campus geofence.',
              { type: 'geofence_exit', geofenceId: identifier, eventId }
            );
          }
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
    this._stopPermissionMonitor();

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

  // Outcome of the most recent auto check-in/out attempt (or null if none
  // yet this install) — surfaced on the Home screen so "why didn't it check
  // me in" has a real answer instead of silence.
  async getLastAutoAttendanceEvent() {
    try {
      const raw = await AsyncStorage.getItem(LAST_AUTO_EVENT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Failed to read last auto attendance event:', e);
      return null;
    }
  }

  async refreshGeofences() {
    return this.startNativeGeofenceMonitoring();
  }

  async clearHistory() {
    await AsyncStorage.removeItem(TRACKING_STATS_KEY);
  }
}

export default new TeacherLiveTrackingService();
