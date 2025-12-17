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

  useEffect(() => {
    initializeScreen();
    setupWebSocketListeners();
  }, []);

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
            const result = await checkIn();
            if (! result.success) {
              Alert.alert('Check-in Failed', result.error);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
            <Text style={[styles. statusTitle, { color: theme. colors.text }]}>
              Today's Status
            </Text>
            {todayAttendance && (
              <StatusBadge status={todayAttendance.status} size="small" />
            )}
          </View>

          <View style={styles.statusContent}>
            <View style={styles.statusItem}>
              <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.statusLabel, { color: theme.colors. textSecondary }]}>
                Date
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors. text }]}>
                {format(new Date(), 'MMM dd, yyyy')}
              </Text>
            </View>

            <View style={styles.statusDivider} />

            <View style={styles.statusItem}>
              <Ionicons name="log-in-outline" size={20} color={theme.colors.success} />
              <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                Check In
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors. text }]}>
                {formatTime(todayAttendance?. checkIn?. timestamp)}
              </Text>
            </View>

            <View style={styles.statusDivider} />

            <View style={styles.statusItem}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                Check Out
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {formatTime(todayAttendance?.checkOut?.timestamp)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Check In/Out Button */}
        <View style={styles.checkInContainer}>
          <CheckInButton
            isCheckedIn={isCheckedIn}
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            disabled={isLoading}
          />
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
              onPress={() => router.push('/attendance/history')}
            >
              <Ionicons name="time-outline" size={28} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/reports')}
            >
              <Ionicons name="stats-chart-outline" size={28} color={theme.colors.secondary} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Reports
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/profile')}
            >
              <Ionicons name="person-outline" size={28} color={theme.colors.info} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: theme.colors.card }]}
              onPress={() => router.push('/settings')}
            >
              <Ionicons name="settings-outline" size={28} color={theme.colors. warning} />
              <Text style={[styles.quickActionText, { color: theme.colors.text }]}>
                Settings
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
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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