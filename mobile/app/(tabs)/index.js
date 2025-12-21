import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Switch,
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
import BackgroundLocationService from '../../src/services/backgroundLocationService';

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
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [trackingStats, setTrackingStats] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    await initializeScreen();
    
    setupWebSocketListeners();
    
    // Request permissions first
    if (!hasPermission) {
      await requestPermissions();
    }
    
    // Start location tracking
    await getCurrentLocation();
    
    // Check if background tracking is active
    const isTracking = await BackgroundLocationService.isTracking();
    setBackgroundTracking(isTracking);
    
    // Load tracking stats
    if (isTracking) {
      const stats = await BackgroundLocationService.getStats();
      setTrackingStats(stats);
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



  const toggleBackgroundTracking = async () => {
    try {
      if (backgroundTracking) {
        // Stop tracking
        Alert.alert(
          'Stop Tracking?',
          'This will stop recording your movements. You can view the history in the History > Movement tab.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Stop',
              style: 'destructive',
              onPress: async () => {
                await BackgroundLocationService.stopTracking();
                setBackgroundTracking(false);
                setTrackingStats(null);
              },
            },
          ]
        );
      } else {
        // Start tracking
        const result = await BackgroundLocationService.startTracking();
        if (result.success) {
          setBackgroundTracking(true);
          Alert.alert(
            '✅ Tracking Started',
            'Your movements are now being recorded.\n\n• Updates every 10 meters or 10 seconds\n• Works even when app is closed\n• View history in History > Movement tab',
            [{ text: 'Got it!' }]
          );
          
          // Load stats
          const stats = await BackgroundLocationService.getStats();
          setTrackingStats(stats);
        } else {
          Alert.alert('Error', result.error || 'Failed to start tracking');
        }
      }
    } catch (error) {
      console.error('Error toggling tracking:', error);
      Alert.alert('Error', error.message);
    }
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
              name={`${user?.firstName} ${user?.lastName}`}
              size={50}
              source={user?.avatar ? { uri: user.avatar } : null}
            />
            <View style={styles.headerText}>
              <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
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

        {/* Background Tracking */}
        <View style={styles.section}>
          <Card style={[styles.trackingCard, { backgroundColor: backgroundTracking ? theme.colors.success + '10' : theme.colors.card }]}>
            <View style={styles.trackingHeader}>
              <View style={styles.trackingTitleContainer}>
                <Ionicons 
                  name={backgroundTracking ? "footsteps" : "footsteps-outline"} 
                  size={24} 
                  color={backgroundTracking ? theme.colors.success : theme.colors.text} 
                />
                <View style={styles.trackingTextContainer}>
                  <Text style={[styles.trackingTitle, { color: theme.colors.text }]}>
                    Background Tracking
                  </Text>
                  <Text style={[styles.trackingSubtitle, { color: theme.colors.textSecondary }]}>
                    {backgroundTracking ? 'Recording your movements' : 'Track even when app closed'}
                  </Text>
                </View>
              </View>
              <Switch
                value={backgroundTracking}
                onValueChange={toggleBackgroundTracking}
                trackColor={{ false: '#d1d5db', true: theme.colors.success + '40' }}
                thumbColor={backgroundTracking ? theme.colors.success : '#f3f4f6'}
              />
            </View>

            {backgroundTracking && trackingStats && (
              <View style={[styles.trackingStats, { borderTopColor: theme.colors.border }]}>
                <View style={styles.trackingStat}>
                  <Text style={[styles.trackingStatLabel, { color: theme.colors.textSecondary }]}>
                    Total Points
                  </Text>
                  <Text style={[styles.trackingStatValue, { color: theme.colors.text }]}>
                    {trackingStats.total}
                  </Text>
                </View>
                <View style={styles.trackingStat}>
                  <Text style={[styles.trackingStatLabel, { color: theme.colors.textSecondary }]}>
                    Synced
                  </Text>
                  <Text style={[styles.trackingStatValue, { color: theme.colors.success }]}>
                    {trackingStats.synced}
                  </Text>
                </View>
                <View style={styles.trackingStat}>
                  <Text style={[styles.trackingStatLabel, { color: theme.colors.textSecondary }]}>
                    Pending
                  </Text>
                  <Text style={[styles.trackingStatValue, { color: theme.colors.warning }]}>
                    {trackingStats.unsynced}
                  </Text>
                </View>
              </View>
            )}
          </Card>
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
  trackingCard: {
    padding: 16,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  trackingTextContainer: {
    flex: 1,
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  trackingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  trackingStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  trackingStat: {
    flex: 1,
    alignItems: 'center',
  },
  trackingStatLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  trackingStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});