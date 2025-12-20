import { geofenceAPI } from './api';
import locationService from './locationService';
import notificationService from './notificationService';
import { useAttendanceStore } from '../store/attendanceStore';

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

class GeofenceService {
  constructor() {
    this.geofences = [];
    this.currentGeofence = null;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.geofenceReloadInterval = null;
    this.lastCheckTime = null;
    this.hasNotifiedEntry = false; // Track if we already sent entry notification
    this.lastNotificationGeofenceId = null; // Track which geofence we last notified about
  }

  /**
   * Load all active geofences
   */
  async loadGeofences() {
    try {
      const response = await geofenceAPI.getAll();
      this.geofences = response?.data || [];
      console.log(`📍 Loaded ${this.geofences.length} geofences`);
      
      // Show geofence locations for debugging
      if (this.geofences.length > 0) {
        this.geofences.forEach(gf => {
          console.log(`🏢 Geofence: ${gf.name} at ${gf.center.coordinates[1]}, ${gf.center.coordinates[0]}, radius: ${gf.radius}m`);
        });
      }
      
      return this.geofences;
    } catch (error) {
      console.error('❌ Error loading geofences:', error);
      return [];
    }
  }

  /**
   * Check if current location is within any geofence
   */
  async checkCurrentLocation() {
    try {
      const location = await locationService.getCurrentLocation();
      
      console.log('📍 Checking location:', {
        lat: location.latitude,
        lng: location.longitude,
        accuracy: location.accuracy
      });
      
      const response = await geofenceAPI.checkLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      const inGeofence = response?.data?.isInside || false;
      const geofences = response?.data?.geofences || [];
      const previousGeofence = this.currentGeofence;
      this.currentGeofence = geofences[0] || null;
      
      // Calculate distance to all geofences for debugging
      if (this.geofences.length > 0 && !inGeofence) {
        console.log('📏 Distance to geofences:');
        this.geofences.forEach(gf => {
          const distance = calculateDistance(
            location.latitude,
            location.longitude,
            gf.center.coordinates[1],
            gf.center.coordinates[0]
          );
          console.log(`  ${gf.name}: ${distance.toFixed(2)}m away (radius: ${gf.radius}m) ${distance <= gf.radius ? '✅ INSIDE' : '❌ OUTSIDE'}`);
        });
      }
      
      console.log('🎯 Geofence check result:', {
        inGeofence,
        geofenceFound: geofences.length,
        geofenceName: this.currentGeofence?.name,
        geofenceCenter: this.currentGeofence?.center ? 
          `${this.currentGeofence.center.latitude}, ${this.currentGeofence.center.longitude}` : 'N/A',
        geofenceRadius: this.currentGeofence?.radius,
        yourLocation: `${location.latitude}, ${location.longitude}`,
        workingHours: this.currentGeofence?.workingHours
      });

      // Handle geofence entry - ONLY trigger if we weren't inside before
      if (inGeofence && !previousGeofence) {
        this.hasNotifiedEntry = false; // Reset notification flag
        await this.handleGeofenceEntry(this.currentGeofence, location);
      }
      // If still inside same geofence, don't trigger again
      else if (inGeofence && previousGeofence && previousGeofence._id === this.currentGeofence._id) {
        // Still inside, do nothing (prevents duplicate notifications)
        console.log('ℹ️ Still inside', this.currentGeofence.name, '- no notification');
      }

      // Handle geofence exit - ONLY trigger if we were inside before
      if (!inGeofence && previousGeofence) {
        this.hasNotifiedEntry = false; // Reset on exit
        this.lastNotificationGeofenceId = null;
        await this.handleGeofenceExit(previousGeofence, location);
      }

      return {
        inGeofence,
        geofence: this.currentGeofence,
        location,
      };
    } catch (error) {
      console.error('❌ Error checking location:', error);
      return { inGeofence: false, geofence: null, location: null };
    }
  }

  /**
   * Handle geofence entry - Auto check-in
   */
  async handleGeofenceEntry(geofence, location) {
    try {
      console.log('🔵 Entered geofence:', geofence.name);

      // Prevent duplicate notifications for same geofence
      if (this.hasNotifiedEntry && this.lastNotificationGeofenceId === geofence._id) {
        console.log('ℹ️ Already notified for this entry, skipping duplicate notification');
        return;
      }

      // Get current attendance status
      const attendanceStore = useAttendanceStore.getState();
      const { todayAttendance } = attendanceStore;

      // Auto check-in if not already checked in
      if (!todayAttendance || !todayAttendance.checkIn?.time) {
        console.log('✅ Auto check-in triggered - user inside geofence');

        // Trigger check-in (backend will handle working hours and late detection)
        const result = await attendanceStore.checkIn(
          `Auto check-in at ${geofence.name}`
        );

        if (result.success) {
          await notificationService.scheduleNotification(
            '✅ Auto Check-in Successful',
            `You were automatically checked in at ${geofence.name}`,
            { type: 'auto_checkin', geofenceId: geofence._id }
          );
          
          // Mark as notified
          this.hasNotifiedEntry = true;
          this.lastNotificationGeofenceId = geofence._id;
        } else {
          console.error('❌ Auto check-in failed:', result.error);
        }
      } else {
        console.log('ℹ️ Already checked in today, skipping auto check-in');
        
        // Still show entry notification if enabled
        if (geofence.alerts?.entryAlert && !this.hasNotifiedEntry) {
          await notificationService.scheduleNotification(
            `📍 Entered ${geofence.name}`,
            'You are now within the designated work area',
            { type: 'geofence_entry', geofenceId: geofence._id }
          );
          this.hasNotifiedEntry = true;
          this.lastNotificationGeofenceId = geofence._id;
        }
      }
    } catch (error) {
      console.error('❌ Error handling geofence entry:', error);
    }
  }

  /**
   * Handle geofence exit - Auto check-out
   */
  async handleGeofenceExit(geofence, location) {
    try {
      console.log('🔴 Exited geofence:', geofence.name);

      // Get current attendance status
      const attendanceStore = useAttendanceStore.getState();
      const { todayAttendance } = attendanceStore;

      // Check if user checked in but hasn't checked out yet
      const isCheckedIn = todayAttendance?.checkIn?.time && !todayAttendance?.checkOut?.time;

      if (isCheckedIn) {
        // AUTO CHECK-OUT when leaving geofence
        console.log('✅ Auto check-out triggered');
        
        const result = await attendanceStore.checkOut(
          `Auto check-out from ${geofence.name}`
        );

        if (result.success) {
          await notificationService.scheduleNotification(
            '🚪 Auto Check-out',
            `You were automatically checked out from ${geofence.name}`,
            { type: 'auto_checkout', geofenceId: geofence._id }
          );
        }
        
        // Check if within working hours (early departure)
        const isWorkingHours = this.isWithinWorkingHours(geofence);

        if (isWorkingHours) {
          // Violation: Left work area before work hours ended
          console.warn('⚠️ VIOLATION: Early departure detected');

          // Send violation alert
          await notificationService.scheduleNotification(
            '⚠️ Early Departure Alert',
            `You left ${geofence.name} before completing your work hours.`,
            { type: 'geofence_violation', severity: 'high', geofenceId: geofence._id }
          );

          // Log violation to backend
          await this.logViolation(geofence, location, 'early_departure');
        }
      }

      // Show exit notification
      if (geofence.alerts?.exitAlert) {
        await notificationService.scheduleNotification(
          `🚪 Left ${geofence.name}`,
          'You have exited the designated work area',
          { type: 'geofence_exit', geofenceId: geofence._id }
        );
      }
    } catch (error) {
      console.error('❌ Error handling geofence exit:', error);
    }
  }

  /**
   * Log violation to backend
   */
  async logViolation(geofence, location, violationType) {
    try {
      // Send location track with violation flag
      await locationService.trackLocation({
        violation: true,
        violationType,
        geofenceId: geofence._id,
        geofenceName: geofence.name,
        severity: 'high',
        notes: `User exited ${geofence.name} during working hours without checking out`,
      });

      console.log('📝 Violation logged to backend');
    } catch (error) {
      console.error('❌ Error logging violation:', error);
    }
  }

  /**
   * Check if current time is within geofence working hours
   */
  isWithinWorkingHours(geofence) {
    if (!geofence.workingHours) {
      return false;
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // New schema: enabled + schedule array
    if (geofence.workingHours.enabled && geofence.workingHours.schedule) {
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const schedule = geofence.workingHours.schedule?.find(
        (s) => s.day.toLowerCase() === dayOfWeek
      );

      if (!schedule) {
        return false;
      }

      return currentTime >= schedule.startTime && currentTime <= schedule.endTime;
    }
    
    // Old schema: start + end
    if (geofence.workingHours.start && geofence.workingHours.end) {
      return currentTime >= geofence.workingHours.start && currentTime <= geofence.workingHours.end;
    }

    return false;
  }

  /**
   * Start monitoring geofences
   */
  async startMonitoring(intervalMs = 10000) { // Check every 10 seconds for better real-time detection
    if (this.isMonitoring) {
      console.warn('⚠️ Geofence monitoring already started');
      return;
    }

    console.log('🎯 Starting geofence monitoring...');

    // Load geofences
    await this.loadGeofences();

    // Initial check
    await this.checkCurrentLocation();

    // Set up periodic checking
    this.monitoringInterval = setInterval(async () => {
      await this.checkCurrentLocation();
    }, intervalMs);

    // Reload geofences every 5 minutes to get updates from admin panel
    this.geofenceReloadInterval = setInterval(async () => {
      console.log('🔄 Reloading geofences to check for updates...');
      await this.loadGeofences();
    }, 300000); // 5 minutes

    this.isMonitoring = true;
    console.log('✅ Geofence monitoring started (checking every 10 seconds)');
  }

  /**
   * Stop monitoring geofences
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.geofenceReloadInterval) {
      clearInterval(this.geofenceReloadInterval);
      this.geofenceReloadInterval = null;
    }

    this.isMonitoring = false;
    this.currentGeofence = null;
    console.log('🛑 Geofence monitoring stopped');
  }

  /**
   * Get current geofence status
   */
  getCurrentStatus() {
    return {
      isMonitoring: this.isMonitoring,
      currentGeofence: this.currentGeofence,
      totalGeofences: this.geofences.length,
      lastCheckTime: this.lastCheckTime,
    };
  }
}

export default new GeofenceService();
