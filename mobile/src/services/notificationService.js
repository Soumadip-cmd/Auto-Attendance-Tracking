import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants/config';

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
      console.error('Error getting push token:', error);
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

      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
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