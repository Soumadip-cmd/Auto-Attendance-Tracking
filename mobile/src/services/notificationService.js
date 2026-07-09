import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants/config';
import { storage } from '../utils/storage';
import { notificationAPI } from './api';

const HISTORY_KEY = 'notification_history';
const DEVICE_ID_KEY = 'device_id';
const PUSH_TOKEN_STATUS_KEY = 'push_token_status';
const MAX_HISTORY = 100;

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Request notification permissions
   */
  async requestPermissions() {
    try {
      if (! Device.isDevice) {
        console.warn('Notifications only work on physical devices');
        return null;
      }

      const { status:  existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Failed to get push notification permissions');
        return null;
      }

      return finalStatus;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return null;
    }
  }

  /**
   * Get Expo Push Token
   */
  async getExpoPushToken() {
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId
        || Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn('No EAS projectId configured — cannot fetch Expo push token');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({ projectId });

      console.log('📱 Expo Push Token:', token.data);
      return token.data;
    } catch (error) {
      console.warn('Push token unavailable:', error?.message || error);
      return null;
    }
  }

  /**
   * Stable per-install device identifier, used to key this device's push
   * token registration on the backend (Device model's unique {user,deviceId}
   * index) so re-registering just updates the same row instead of piling up
   * duplicates.
   */
  async getOrCreateDeviceId() {
    let id = await storage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await storage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  }

  /**
   * Fetch this device's Expo push token and register it with the backend so
   * auto check-in/check-out can actually reach the teacher — permissions
   * alone aren't enough, the backend has no way to notify a device it has
   * never been told the token for.
   *
   * Persists a status record (see getPushTokenStatus) so Settings can show
   * whether this actually succeeded instead of failing silently — this runs
   * fire-and-forget from startTracking(), so nothing else surfaces failures.
   */
  async registerPushToken() {
    if (!Device.isDevice) {
      await this._setPushTokenStatus({ registered: false, reason: 'not_a_physical_device' });
      return null;
    }

    const permission = await this.requestPermissions();
    if (permission !== 'granted') {
      await this._setPushTokenStatus({ registered: false, reason: 'permission_not_granted' });
      return null;
    }

    const token = await this.getExpoPushToken();
    if (!token) {
      await this._setPushTokenStatus({ registered: false, reason: 'no_expo_push_token' });
      return null;
    }

    try {
      const deviceId = await this.getOrCreateDeviceId();
      await notificationAPI.registerDevice(deviceId, token, Platform.OS);
      await this._setPushTokenStatus({ registered: true, token });
      return token;
    } catch (error) {
      await this._setPushTokenStatus({
        registered: false,
        reason: 'backend_registration_failed',
        detail: error?.response?.data?.message || error?.message,
      });
      return null;
    }
  }

  async _setPushTokenStatus(status) {
    try {
      await storage.setItem(PUSH_TOKEN_STATUS_KEY, { ...status, checkedAt: new Date().toISOString() });
    } catch (error) {
      // Non-fatal — this is a debug/diagnostic record only.
    }
  }

  /**
   * Last known outcome of registerPushToken(), for a Settings screen
   * "push token: registered ✓/✗" indicator — so a failure (missing
   * permission, no EAS projectId, backend unreachable, etc.) is visible
   * instead of just silently never delivering auto check-in/out pushes.
   */
  async getPushTokenStatus() {
    return (await storage.getItem(PUSH_TOKEN_STATUS_KEY)) || null;
  }

  /**
   * Configure notification channel (Android)
   */
  async configureChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(APP_CONFIG.NOTIFICATION_CHANNEL_ID, {
        name:  APP_CONFIG.NOTIFICATION_CHANNEL_NAME,
        importance:  Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:  '#6366f1',
        sound: 'default',
      });
    }
  }

  /**
   * Schedule local notification
   */
  async scheduleNotification(title, body, data = {}, trigger = null) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority:  Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger:  trigger || null, // null = immediate
      });

      // Only persist immediate (non-scheduled/repeating) notifications to
      // history — reminders that repeat daily would otherwise flood the list.
      if (!trigger) {
        await this._appendHistory({ id, title, body, data });
      }

      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Append an entry to the local notification history (capped, newest first)
   */
  async _appendHistory({ id, title, body, data }) {
    try {
      const history = (await storage.getItem(HISTORY_KEY)) || [];
      history.unshift({
        id: id || `local-${Date.now()}`,
        title,
        body,
        data,
        timestamp: new Date().toISOString(),
        read: false,
      });
      await storage.setItem(HISTORY_KEY, history.slice(0, MAX_HISTORY));
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }

  /**
   * Get notification history, newest first
   */
  async getHistory() {
    return (await storage.getItem(HISTORY_KEY)) || [];
  }

  /**
   * Get count of unread notifications in history
   */
  async getUnreadCount() {
    const history = await this.getHistory();
    return history.filter((item) => !item.read).length;
  }

  /**
   * Mark all history entries as read
   */
  async markAllRead() {
    const history = await this.getHistory();
    await storage.setItem(HISTORY_KEY, history.map((item) => ({ ...item, read: true })));
  }

  /**
   * Clear notification history
   */
  async clearHistory() {
    await storage.removeItem(HISTORY_KEY);
  }

  /**
   * Schedule check-in reminder
   */
  async scheduleCheckInReminder() {
    const [hour, minute] = APP_CONFIG. CHECK_IN_REMINDER_TIME.split(':');
    
    await this.scheduleNotification(
      'Time to Check In!  ⏰',
      'Don\'t forget to check in for today',
      { type: 'check_in_reminder' },
      {
        hour: parseInt(hour),
        minute: parseInt(minute),
        repeats: true,
      }
    );
  }

  /**
   * Schedule check-out reminder
   */
  async scheduleCheckOutReminder() {
    const [hour, minute] = APP_CONFIG.CHECK_OUT_REMINDER_TIME.split(':');
    
    await this.scheduleNotification(
      'Time to Check Out! 🏁',
      'Remember to check out before leaving',
      { type: 'check_out_reminder' },
      {
        hour: parseInt(hour),
        minute: parseInt(minute),
        repeats: true,
      }
    );
  }

  /**
   * Cancel all notifications
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Set up listeners
   */
  setupListeners(onNotificationReceived, onNotificationResponse) {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      onNotificationReceived
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      onNotificationResponse
    );
  }

  /**
   * Remove listeners
   */
  removeListeners() {
    if (this.notificationListener) {
      try {
        if (typeof Notifications.removeNotificationSubscription === 'function') {
          Notifications.removeNotificationSubscription(this.notificationListener);
        } else {
          // For newer versions of expo-notifications
          this.notificationListener.remove();
        }
      } catch (error) {
        console.warn('Error removing notification listener:', error);
      }
    }
    if (this.responseListener) {
      try {
        if (typeof Notifications.removeNotificationSubscription === 'function') {
          Notifications.removeNotificationSubscription(this.responseListener);
        } else {
          // For newer versions of expo-notifications
          this.responseListener.remove();
        }
      } catch (error) {
        console.warn('Error removing response listener:', error);
      }
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount() {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }
}

export default new NotificationService();
