import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '../../src/hooks/useAuth';
import { useAttendance } from '../../src/hooks/useAttendance';
import { useLocation } from '../../src/hooks/useLocation';
import { useWebSocket } from '../../src/hooks/useWebSocket';
import { useTheme } from '../../src/hooks/useTheme';
import { Card } from '../../src/components/common/Card';
import { Avatar } from '../../src/components/common/Avatar';
import { CheckInButton } from '../../src/components/attendance/CheckInButton';
import { StatsCard } from '../../src/components/attendance/StatsCard';
import { StatusBadge } from '../../src/components/attendance/StatusBadge';
import geofenceService from '../../src/services/geofenceService';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    todayAttendance,
    isCheckedIn,
    checkIn,
    checkOut,
    getTodayAttendance,
    getStats,
    stats,
    isLoading,
  } = useAttendance();
  const { location, getCurrentLocation, hasPermission, requestPermissions } = useLocation();
  const { isConnected, on } = useWebSocket();
  const { theme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [geofenceStatus, setGeofenceStatus] = useState(null);
  const [allGeofences, setAllGeofences] = useState([]);

  useEffect(() => {
    initializeApp();

    // Cleanup on unmount
    return () => {
      geofenceService.stopMonitoring();
    };
  }, []);

  const initializeApp = async () => {
    await initializeScreen();
    
    // Load geofences FIRST before monitoring
    await loadGeofences();
    
    setupWebSocketListeners();
    
    // Request permissions first
    if (!hasPermission) {
      await requestPermissions();
    }
    
    // Start location tracking
    await getCurrentLocation();
    
    // Start geofence monitoring AFTER loading geofences
    await startGeofenceMonitoring();
    
    // Do initial geofence check and auto check-in if needed
    setTimeout(async () => {
      await updateGeofenceStatus();
      await checkAndAutoCheckIn();
    }, 2000); // Wait 2 seconds for location to stabilize

    // Update geofence status periodically
    const statusInterval = setInterval(async () => {
      await updateGeofenceStatus();
      await checkAndAutoCheckIn();
    }, 15000); // Every 15 seconds

    return statusInterval;
  };

  const startGeofenceMonitoring = async () => {
    try {
      if (hasPermission) {
        await geofenceService.startMonitoring(10000); // Check every 10 seconds for real-time detection
        await updateGeofenceStatus(); // Initial status check
        console.log('✅ Geofence monitoring started (10 second intervals)');
      }
    } catch (error) {
      console.error('❌ Error starting geofence monitoring:', error);
    }
  };

  const loadGeofences = async () => {
    try {
      const geofences = await geofenceService.loadGeofences();
      setAllGeofences(geofences);
      console.log('📍 Loaded geofences for working hours display:', geofences.length);
      if (geofences.length > 0) {
        console.log('🏢 First geofence details:', {
          name: geofences[0].name,
          workingHours: geofences[0].workingHours,
          radius: geofences[0].radius
        });
      }
      return geofences;
    } catch (error) {
      console.error('❌ Error loading geofences:', error);
      return [];
    }
  };

  const updateGeofenceStatus = async () => {
    try {
      const status = await geofenceService.checkCurrentLocation();
      console.log('🏢 Geofence status updated:', {
        inGeofence: status.inGeofence,
        geofenceName: status.geofence?.name,
        workingHours: status.geofence?.workingHours
      });
      setGeofenceStatus(status);
      return status;
    } catch (error) {
      console.error('❌ Error updating geofence status:', error);
      return null;
    }
  };

  const checkAndAutoCheckIn = async () => {
    try {
      // Don't auto check-in if already checked in
      if (isCheckedIn) {
        return;
      }

      const status = geofenceStatus || await updateGeofenceStatus();
      
      if (status && status.inGeofence && status.geofence) {
        console.log('✅ User is inside geofence, checking if auto check-in needed');
        
        // Let geofenceService handle the auto check-in logic
        // It will check working hours and handle the check-in
        await geofenceService.handleGeofenceEntry(status.geofence, status.location);
      }
    } catch (error) {
      console.error('❌ Error in auto check-in check:', error);
    }
  };

  const initializeScreen = async () => {
    // Only fetch if not already loading or in error state
    // This prevents continuous failed API calls
    if (!isLoading) {
      try {
        await getTodayAttendance();
        await getStats({ period: 'month' });
      } catch (error) {
        // Silently handle - error is already logged
        console.log('Failed to initialize data - check network connection');
      }
    }
    
    if (!hasPermission) {
      await requestPermissions();
    }
  };

  const setupWebSocketListeners = () => {
    const unsubscribe = on('attendance: updated', (data) => {
      console.log('Attendance updated via WebSocket:', data);
      getTodayAttendance();
    });

    return unsubscribe;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await getTodayAttendance();
    await getStats({ period: 'month' });
    await loadGeofences(); // Reload geofences to get updated working hours
    await updateGeofenceStatus(); // Update current geofence status
    setRefreshing(false);
  };

  const handleCheckIn = async () => {
    if (!hasPermission) {
      Alert.alert(
        'Location Permission Required',
        'Please enable location permissions to check in',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: requestPermissions },
        ]
      );
      return;
    }

    await getCurrentLocation();
    
    Alert.alert(
      'Check In',
      'Do you want to check in now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check In',
          onPress: async () => {
            console.log('🔵 User clicked Check In');
            const result = await checkIn();
            console.log('🔵 Check-in result:', result);
            if (!result.success) {
              console.error('🔴 Check-in failed:', result.error);
              Alert.alert(
                'Check-in Failed',
                result.error || 'An error occurred. Please try again.'
              );
            } else {
              console.log('🟢 Check-in successful, refreshing...');
              // Refresh to show updated times
              await getTodayAttendance();
            }
          },
        },
      ]
    );
  };

  const handleCheckOut = async () => {
    Alert.alert(
      'Check Out',
      'Do you want to check out now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Check Out',
          style: 'destructive',
          onPress: async () => {
            const result = await checkOut();
            if (!result.success) {
              Alert.alert('Check-out Failed', result.error);
            } else {
              // Refresh to show updated times
              await getTodayAttendance();
            }
          },
        },
      ]
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--';
    return format(new Date(timestamp), 'hh:mm a');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getWorkingHoursText = (workingHours) => {
    // Support both new schema (enabled + schedule) and old schema (start + end)
    if (workingHours?.enabled && workingHours?.schedule?.length) {
      // New schema with schedule array - match day names
      const daysMap = {
        'sunday': 'sunday',
        'monday': 'monday',
        'tuesday': 'tuesday',
        'wednesday': 'wednesday',
        'thursday': 'thursday',
        'friday': 'friday',
        'saturday': 'saturday'
      };
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const todaySchedule = workingHours.schedule.find(s => s.day?.toLowerCase() === today);

      if (todaySchedule && todaySchedule.startTime && todaySchedule.endTime) {
        return `${formatTimeString(todaySchedule.startTime)} - ${formatTimeString(todaySchedule.endTime)}`;
      }
      // Fallback to first schedule if today not found
      if (workingHours.schedule[0]?.startTime) {
        return `${formatTimeString(workingHours.schedule[0].startTime)} - ${formatTimeString(workingHours.schedule[0].endTime)}`;
      }
    } else if (workingHours?.start && workingHours?.end) {
      // Old schema with simple start/end
      return `${formatTimeString(workingHours.start)} - ${formatTimeString(workingHours.end)}`;
    }
    
    // Default fallback
    return '9:00 AM - 6:00 PM';
  };

  const formatTimeString = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar
              name={`${user?. firstName} ${user?.lastName}`}
              size={50}
              source={user?.avatar ?  { uri: user.avatar } :  null}
            />
            <View style={styles.headerText}>
              <Text style={[styles.greeting, { color: theme.colors. textSecondary }]}>
                {getGreeting()},
              </Text>
              <Text style={[styles.userName, { color: theme.colors. text }]}>
                {user?.firstName}!   👋
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {isConnected && (
              <View style={styles.connectionIndicator}>
                <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
              </View>
            )}
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Status Card */}
        <Card style={styles.statusCard} elevation="lg">
          <View style={styles.statusHeader}>
            <View style={styles.statusTitleContainer}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} style={styles.statusIcon} />
              <Text style={[styles. statusTitle, { color: theme. colors.text }]}>
                Today's Status
              </Text>
            </View>
            <View style={styles.dateContainer}>
              <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                {format(new Date(), 'EEE, MMM dd')}
              </Text>
            </View>
          </View>
          {todayAttendance && (
            <View style={styles.statusBadgeContainer}>
              <StatusBadge status={todayAttendance.status} size="small" />
            </View>
          )}

          {/* Geofence Status Indicator */}
          {geofenceStatus?.inGeofence && (
            <View style={[styles.geofenceIndicator, { backgroundColor: theme.colors.success + '15', borderColor: theme.colors.success }]}>
              <Ionicons name="location" size={16} color={theme.colors.success} />
              <Text style={[styles.geofenceText, { color: theme.colors.success }]}>
                Inside {geofenceStatus.geofence?.name || 'Work Area'}
              </Text>
            </View>
          )}

          <View style={styles.statusContent}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Ionicons name="log-in-outline" size={18} color={theme.colors.success} />
                <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                  Check In
                </Text>
                <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                  {formatTime(todayAttendance?.checkIn?.time)}
                </Text>
              </View>

              <View style={styles.statusDivider} />

              <View style={styles.statusItem}>
                <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
                <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                  Check Out
                </Text>
                <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                  {formatTime(todayAttendance?.checkOut?.time)}
                </Text>
              </View>
            </View>
            
            {/* Work Hours from Geofence */}
            <View style={[styles.workScheduleHint, { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
              <Ionicons name="time-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.workScheduleText, { color: theme.colors.primary }]}>
                Work Hours: {(() => {
                  // First try current geofence if inside
                  if (geofenceStatus?.geofence?.workingHours) {
                    return getWorkingHoursText(geofenceStatus.geofence.workingHours);
                  }
                  // Then try first available geofence
                  if (allGeofences.length > 0 && allGeofences[0].workingHours) {
                    return getWorkingHoursText(allGeofences[0].workingHours);
                  }
                  // Default fallback
                  return '9:00 AM - 6:00 PM';
                })()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Check In/Out Button */}
        <View style={styles.checkInContainer}>
          {todayAttendance?.checkIn?.time && todayAttendance?.checkOut?.time ? (
            // Already completed attendance for today
            <Card style={[styles.completedCard, { backgroundColor: theme.colors.success + '15', borderColor: theme.colors.success }]}>
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
              <Text style={[styles.completedText, { color: theme.colors.success }]}>
                Attendance Completed
              </Text>
              <Text style={[styles.completedSubtext, { color: theme.colors.textSecondary }]}>
                You've checked in and out for today
              </Text>
            </Card>
          ) : (
            <CheckInButton
              isCheckedIn={isCheckedIn}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
              disabled={isLoading}
            />
          )}
        </View>

        {/* Monthly Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              This Month
            </Text>
            <TouchableOpacity onPress={() => router.push('/reports')}>
              <Text style={[styles.sectionLink, { color: theme.colors.primary }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatsCard
              icon="checkmark-done-circle"
              label="Present Days"
              value={stats?.presentDays || 0}
              color={theme.colors.success}
              subtitle={`${stats?.attendanceRate || 0}% attendance`}
            />

            <StatsCard
              icon="time"
              label="Late Days"
              value={stats?. lateDays || 0}
              color={theme.colors.warning}
            />

            <StatsCard
              icon="close-circle"
              label="Absent Days"
              value={stats?.absentDays || 0}
              color={theme.colors.error}
            />

            <StatsCard
              icon="briefcase"
              label="Working Hours"
              value={`${stats?.totalHours || 0}h`}
              color={theme.colors.info}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors. text }]}>
            Quick Actions
          </Text>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/(tabs)/history')}
            >
              <Ionicons name="time-outline" size={28} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/(tabs)/map')}
            >
              <Ionicons name="map-outline" size={28} color={theme.colors.success} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Map
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/(tabs)/reports')}
            >
              <Ionicons name="stats-chart-outline" size={28} color={theme.colors.secondary} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Reports
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Ionicons name="person-outline" size={28} color={theme.colors.info} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header:  {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom:  24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems:  'center',
  },
  headerText: {
    marginLeft: 12,
  },
  greeting:  {
    fontSize: 14,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems:  'center',
    gap: 16,
  },
  connectionIndicator: {
    padding: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCard: {
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  statusTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 8,
  },
  dateContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadgeContainer: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusContent: {
    marginTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  workScheduleHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    gap: 6,
  },
  workScheduleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
  },
  checkInContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  completedCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginVertical: 32,
  },
  completedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  completedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
  geofenceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  geofenceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section:  {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionLink: {
    fontSize:  14,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActions: {
    flexDirection:  'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});