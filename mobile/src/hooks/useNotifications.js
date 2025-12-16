import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';

export const useNotifications = () => {
  const [hasPermission, setHasPermission] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    setupNotifications();

    // Setup listeners
    notificationService.setupListeners(
      (notification) => {
        setNotification(notification);
      },
      (response) => {
        console.log('Notification response:', response);
        // Handle notification tap
      }
    );

    return () => {
      notificationService.removeListeners();
    };
  }, []);

  const setupNotifications = async () => {
    try {
      const permission = await notificationService.requestPermissions();
      setHasPermission(permission === 'granted');

      if (permission === 'granted') {
        const token = await notificationService.getExpoPushToken();
        setExpoPushToken(token);
        
        await notificationService.configureChannel();
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const scheduleNotification = useCallback(async (title, body, data, trigger) => {
    return await notificationService.scheduleNotification(title, body, data, trigger);
  }, []);

  const scheduleCheckInReminder = useCallback(async () => {
    return await notificationService.scheduleCheckInReminder();
  }, []);

  const scheduleCheckOutReminder = useCallback(async () => {
    return await notificationService.scheduleCheckOutReminder();
  }, []);

  const cancelAllNotifications = useCallback(async () => {
    return await notificationService.cancelAllNotifications();
  }, []);

  return {
    hasPermission,
    expoPushToken,
    notification,
    scheduleNotification,
    scheduleCheckInReminder,
    scheduleCheckOutReminder,
    cancelAllNotifications,
  };
};