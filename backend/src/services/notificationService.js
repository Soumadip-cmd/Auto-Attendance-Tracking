const admin = require('firebase-admin');
const https = require('https');
const { Device, User, Event } = require('../models');
const logger = require('../config/logger');

const isExpoPushToken = (token) =>
  typeof token === 'string' && (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));

// Mobile registers Expo push tokens (see mobile/src/services/notificationService.js
// getExpoPushToken), not raw FCM registration tokens — those can only be
// delivered through Expo's push service, not admin.messaging(). This needs no
// Firebase credentials at all, unlike the FCM path below, so it works even
// when FIREBASE_* env vars are unset.
const sendViaExpo = (tokens, notification) => new Promise((resolve) => {
  const messages = tokens.map((to) => ({
    to,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: 'default',
    priority: 'high',
  }));

  const payload = JSON.stringify(messages);
  const req = https.request(
    {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true });
        } else {
          logger.warn(`Expo push send failed: HTTP ${res.statusCode} ${body}`);
          resolve({ success: false });
        }
      });
    }
  );
  req.on('error', (error) => {
    logger.error('Expo push send request failed:', error);
    resolve({ success: false });
  });
  req.write(payload);
  req.end();
});

class NotificationService {
  constructor() {
    this.fcmInitialized = false;
    this.initializeFCM();
  }

  /**
   * Initialize Firebase Cloud Messaging
   */
  initializeFCM() {
    try {
      // Only initialize if credentials are provided
      if (process.env.FIREBASE_PROJECT_ID && process.env. FIREBASE_PRIVATE_KEY) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL
          })
        });
        this.fcmInitialized = true;
        logger.info('Firebase Cloud Messaging initialized successfully');
      } else {
        logger.warn('Firebase credentials not found. Push notifications disabled.');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase:', error);
    }
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(userId, notification) {
    try {
      // Get user's devices with push tokens
      const devices = await Device.find({
        user: userId,
        isActive: true,
        pushToken: { $exists: true, $ne: null }
      });

      if (devices.length === 0) {
        logger.info(`No devices found for user ${userId}`);
        return { success: false, message: 'No devices found' };
      }

      const tokens = devices.map(d => d.pushToken);
      const expoTokens = tokens.filter(isExpoPushToken);
      const fcmTokens = tokens.filter((t) => !isExpoPushToken(t));

      let successCount = 0;
      let failureCount = 0;

      if (expoTokens.length > 0) {
        const result = await sendViaExpo(expoTokens, notification);
        if (result.success) successCount += expoTokens.length;
        else failureCount += expoTokens.length;
      }

      if (fcmTokens.length > 0) {
        if (!this.fcmInitialized) {
          logger.warn('FCM not initialized — skipping raw FCM tokens.');
          failureCount += fcmTokens.length;
        } else {
          const message = {
            notification: {
              title: notification.title,
              body: notification.body,
              imageUrl: notification.imageUrl
            },
            data: notification.data || {},
            tokens: fcmTokens
          };

          const response = await admin.messaging().sendMulticast(message);
          successCount += response.successCount;
          failureCount += response.failureCount;

          if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
              if (!resp.success) failedTokens.push(fcmTokens[idx]);
            });
            await this.removeInvalidTokens(failedTokens);
          }
        }
      }

      await Event.log({
        eventType: 'notification.sent',
        actor: userId,
        severity: 'info',
        details: {
          title: notification.title,
          successCount,
          failureCount
        }
      });

      return { success: successCount > 0, successCount, failureCount };
    } catch (error) {
      logger.error('Error sending push notification:', error);
      throw error;
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMultipleUsers(userIds, notification) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, notification))
    );

    const summary = {
      total: userIds.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || ! r.value.success).length
    };

    return summary;
  }

  /**
   * Send notification to all admins
   */
  async sendToAdmins(notification) {
    const admins = await User.find({ 
      role: { $in: ['admin', 'manager'] }, 
      isActive: true 
    }).select('_id');

    const adminIds = admins.map(a => a._id);

    return this.sendToMultipleUsers(adminIds, notification);
  }

  /**
   * Send notification to department
   */
  async sendToDepartment(department, notification) {
    const users = await User.find({ 
      department, 
      isActive: true 
    }).select('_id');

    const userIds = users. map(u => u._id);

    return this.sendToMultipleUsers(userIds, notification);
  }

  /**
   * Send check-in reminder notification
   */
  async sendCheckInReminder(userId) {
    const notification = {
      title: '⏰ Check-In Reminder',
      body: 'Don\'t forget to check in for today! ',
      data: {
        type: 'check_in_reminder',
        action: 'open_checkin'
      }
    };

    return this. sendToUser(userId, notification);
  }

  /**
   * Send check-out reminder notification
   */
  async sendCheckOutReminder(userId) {
    const notification = {
      title:  '👋 Check-Out Reminder',
      body: 'Remember to check out before leaving!',
      data: {
        type:  'check_out_reminder',
        action: 'open_checkout'
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send late arrival notification
   */
  async sendLateArrivalNotification(userId, lateBy) {
    const notification = {
      title: '⚠️ Late Arrival',
      body: `You arrived ${lateBy} minutes late today.  Please try to arrive on time.`,
      data: {
        type: 'late_arrival',
        lateBy: lateBy. toString()
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send auto check-in confirmation to the teacher
   */
  async sendAutoCheckInNotification(userId, checkInTime) {
    const timeLabel = new Date(checkInTime).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });
    const notification = {
      title: '✅ Checked In',
      body: `You were automatically checked in at ${timeLabel}.`,
      data: {
        type: 'auto_checkin',
        time: new Date(checkInTime).toISOString()
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send auto check-out confirmation to the teacher
   */
  async sendAutoCheckOutNotification(userId, checkOutTime) {
    const timeLabel = new Date(checkOutTime).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
    });
    const notification = {
      title: '👋 Checked Out',
      body: `You were automatically checked out at ${timeLabel}.`,
      data: {
        type: 'auto_checkout',
        time: new Date(checkOutTime).toISOString()
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send geofence violation notification to managers
   */
  async sendGeofenceViolationNotification(user, geofence) {
    const notification = {
      title:  '🚨 Geofence Violation Alert',
      body: `${user.fullName} has left ${geofence.name} during working hours`,
      data: {
        type: 'geofence_violation',
        userId: user._id. toString(),
        userName: user.fullName,
        geofenceId: geofence._id. toString(),
        geofenceName: geofence.name
      }
    };

    return this.sendToAdmins(notification);
  }

  /**
   * Send attendance approved notification
   */
  async sendAttendanceApprovedNotification(userId, date) {
    const notification = {
      title: '✅ Attendance Approved',
      body: `Your attendance for ${date} has been approved`,
      data: {
        type:  'attendance_approved',
        date
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send attendance rejected notification
   */
  async sendAttendanceRejectedNotification(userId, date, reason) {
    const notification = {
      title: '❌ Attendance Rejected',
      body: `Your attendance for ${date} has been rejected. Reason: ${reason}`,
      data: {
        type: 'attendance_rejected',
        date,
        reason
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send weekly report notification
   */
  async sendWeeklyReportNotification(userId, stats) {
    const notification = {
      title: '📊 Weekly Attendance Report',
      body: `This week:  ${stats.present} days present, ${stats.late} late arrivals.  Attendance rate: ${stats.attendanceRate}%`,
      data: {
        type: 'weekly_report',
        stats: JSON.stringify(stats)
      }
    };

    return this. sendToUser(userId, notification);
  }

  /**
   * Send account activated notification
   */
  async sendAccountActivatedNotification(userId) {
    const notification = {
      title: '🎉 Account Activated',
      body: 'Your account has been activated.  You can now use the attendance tracking system.',
      data: {
        type: 'account_activated'
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send account deactivated notification
   */
  async sendAccountDeactivatedNotification(userId) {
    const notification = {
      title: '⛔ Account Deactivated',
      body: 'Your account has been deactivated. Please contact your administrator.',
      data: {
        type: 'account_deactivated'
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Send emergency alert to all users
   */
  async sendEmergencyAlert(title, message) {
    const users = await User.find({ isActive: true }).select('_id');
    const userIds = users.map(u => u._id);

    const notification = {
      title: `🚨 ${title}`,
      body: message,
      data: {
        type: 'emergency_alert',
        priority: 'high'
      }
    };

    return this.sendToMultipleUsers(userIds, notification);
  }

  /**
   * Send shift reminder notification
   */
  async sendShiftReminderNotification(userId, shiftDetails) {
    const notification = {
      title: '⏰ Shift Reminder',
      body: `Your shift starts at ${shiftDetails.startTime}.  Location: ${shiftDetails.location}`,
      data: {
        type: 'shift_reminder',
        shiftId: shiftDetails. id,
        startTime: shiftDetails.startTime,
        location: shiftDetails.location
      }
    };

    return this.sendToUser(userId, notification);
  }

  /**
   * Register device token
   */
  async registerDeviceToken(userId, deviceId, token, deviceType = 'android') {
    // Mobile doesn't otherwise create a Device row before this call, so this
    // has to upsert rather than assume one already exists (see the login
    // flow's optional deviceInfo path in authService.js, which the mobile
    // client doesn't currently use).
    await Device.findOneAndUpdate(
      { user: userId, deviceId },
      { user: userId, deviceId, deviceType, pushToken: token, isActive: true },
      { upsert: true, setDefaultsOnInsert: true }
    );

    logger.info(`Push token registered for user ${userId}, device ${deviceId}`);

    return { success: true, message: 'Push token registered' };
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(userId, deviceId) {
    const device = await Device. findOne({ user: userId, deviceId });

    if (!device) {
      throw new Error('Device not found');
    }

    device.pushToken = null;
    await device.save();

    logger.info(`Push token unregistered for user ${userId}, device ${deviceId}`);

    return { success: true, message: 'Push token unregistered' };
  }

  /**
   * Remove invalid tokens
   */
  async removeInvalidTokens(tokens) {
    try {
      await Device.updateMany(
        { pushToken:  { $in: tokens } },
        { $unset: { pushToken: 1 } }
      );

      logger.info(`Removed ${tokens.length} invalid push tokens`);
    } catch (error) {
      logger.error('Error removing invalid tokens:', error);
    }
  }

  /**
   * Send topic notification (for broadcasting)
   */
  async sendToTopic(topic, notification) {
    if (!this.fcmInitialized) {
      logger.warn('FCM not initialized. Topic notification not sent.');
      return { success: false, message: 'FCM not initialized' };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: notification. data || {},
        topic
      };

      const response = await admin.messaging().send(message);

      logger.info(`Topic notification sent to ${topic}: `, response);

      return { success: true, messageId: response };
    } catch (error) {
      logger.error('Error sending topic notification:', error);
      throw error;
    }
  }

  /**
   * Subscribe user to topic
   */
  async subscribeToTopic(userId, topic) {
    const devices = await Device.find({
      user: userId,
      isActive: true,
      pushToken: { $exists: true, $ne: null }
    });

    if (devices.length === 0) {
      return { success: false, message: 'No devices found' };
    }

    const tokens = devices. map(d => d.pushToken);

    try {
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      logger.info(`Subscribed user ${userId} to topic ${topic}`);
      return { success: true, successCount: response.successCount };
    } catch (error) {
      logger.error('Error subscribing to topic:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe user from topic
   */
  async unsubscribeFromTopic(userId, topic) {
    const devices = await Device. find({
      user: userId,
      isActive: true,
      pushToken: { $exists:  true, $ne: null }
    });

    if (devices.length === 0) {
      return { success: false, message:  'No devices found' };
    }

    const tokens = devices.map(d => d.pushToken);

    try {
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      logger.info(`Unsubscribed user ${userId} from topic ${topic}`);
      return { success: true, successCount: response.successCount };
    } catch (error) {
      logger.error('Error unsubscribing from topic:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();