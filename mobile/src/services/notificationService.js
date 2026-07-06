import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants/config';
import { storage } from '../utils/storage';

const HISTORY_KEY = 'notification_history';
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
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Get from app. json
      });

      console.log('📱 Expo Push Token:', token. data);
      return token.data;
    } catch (error) {
      console.warn('Push token unavailable:', error?.message || error);
      return null;
    }
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
