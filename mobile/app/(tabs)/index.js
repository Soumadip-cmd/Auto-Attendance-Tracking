import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Switch } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import TeacherLiveTrackingService from '../../src/services/teacherLiveTrackingService';
import notificationService from '../../src/services/notificationService';
import { geofenceAPI } from '../../src/services/api';
import { getUserAvatarUri } from '../../src/constants/config';
export default function HomeScreen() {
  const router = useRouter();
  const {
    user
  } = useAuth();
  const {
    todayAttendance,
    isCheckedIn,
    checkIn,
    checkOut,
    getTodayAttendance,
    getStats,
    stats,
    isLoading
  } = useAttendance();
  const {
    location,
    getCurrentLocation,
    hasPermission,
    requestPermissions
  } = useLocation();
  const {
    isConnected,
    on
  } = useWebSocket();
  const {
    theme
  } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [backgroundTracking, setBackgroundTracking] = useState(false);
  const [trackingStats, setTrackingStats] = useState(null);
  const [geofences, setGeofences] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [lastAutoEvent, setLastAutoEvent] = useState(null);
  const [backgroundSubmitSupported, setBackgroundSubmitSupported] = useState(null);

  useFocusEffect(
    useCallback(() => {
      getTodayAttendance();
      getStats({ period: 'month' });
      notificationService.getUnreadCount().then(setUnreadNotifications);
      TeacherLiveTrackingService.getLastAutoAttendanceEvent().then(setLastAutoEvent);
      TeacherLiveTrackingService.isDirectBackgroundSubmitSupported().then(setBackgroundSubmitSupported);
    }, [])
  );
  useEffect(() => {
    initializeApp();
  }, []);
  const initializeApp = async () => {
    const autoGeofenceList = await initializeScreen();
    setupWebSocketListeners();
    if (!hasPermission) {
      await requestPermissions();
    }
    await getCurrentLocation();
    let isTracking = await TeacherLiveTrackingService.isTracking();
    if (!isTracking && hasAutoAttendanceGeofence(autoGeofenceList)) {
      try {
        const result = await TeacherLiveTrackingService.startTracking();
        isTracking = !!result.success;
      } catch (error) {
        console.warn('Auto attendance tracking could not start:', error?.message);
      }
    }
    setBackgroundTracking(isTracking);
    if (isTracking) {
      const stats = await TeacherLiveTrackingService.getStats();
      setTrackingStats(stats);
    }
  };
  const initializeScreen = async () => {
    let autoGeofenceList = [];
    if (!isLoading) {
      try {
        await getTodayAttendance();
        await getStats({
          period: 'month'
        });
      } catch (error) {
        console.log('Failed to initialize data - check network connection');
      }
    }
    try {
      const res = await geofenceAPI.getAll({
        isActive: true,
        mine: true,
        autoAttendance: true,
        limit: 20
      });
      const list = res?.data || res?.geofences || [];
      autoGeofenceList = Array.isArray(list) ? list : [];
      setGeofences(autoGeofenceList);
    } catch (e) {
      // geofences not critical for dashboard
    }
    if (!hasPermission) {
      await requestPermissions();
    }
    return autoGeofenceList;
  };
  const setupWebSocketListeners = () => {
    const unsubscribe = on('attendance:updated', data => {
      console.log('Attendance updated via WebSocket:', data);
      getTodayAttendance();
    });
    return unsubscribe;
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await getTodayAttendance();
    await getStats({
      period: 'month'
    });
    try {
      const res = await geofenceAPI.getAll({
        isActive: true,
        mine: true,
        autoAttendance: true,
        limit: 20
      });
      const list = res?.data || res?.geofences || [];
      setGeofences(Array.isArray(list) ? list : []);
    } catch (e) {}
    setRefreshing(false);
  };
  const handleCheckIn = async () => {
    if (!hasPermission) {
      Alert.alert('Location Permission Required', 'Please enable location permissions to check in', [{
        text: 'Cancel',
        style: 'cancel'
      }, {
        text: 'Enable',
        onPress: requestPermissions
      }]);
      return;
    }
    await getCurrentLocation();
    Alert.alert('Check In', 'Do you want to check in now?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
      text: 'Check In',
      onPress: async () => {
        console.log('🔵 User clicked Check In');
        const result = await checkIn();
        console.log('🔵 Check-in result:', result);
        if (!result.success) {
          console.error('🔴 Check-in failed:', result.error);
          Alert.alert('Check-in Failed', result.error || 'An error occurred. Please try again.');
        } else {
          console.log('🟢 Check-in successful, refreshing...');
          // Refresh to show updated times
          await getTodayAttendance();
        }
      }
    }]);
  };
  const handleCheckOut = async () => {
    Alert.alert('Check Out', 'Do you want to check out now?', [{
      text: 'Cancel',
      style: 'cancel'
    }, {
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
      }
    }]);
  };
  const formatTime = timestamp => {
    if (!timestamp) return '--:--';
    return format(new Date(timestamp), 'hh:mm a');
  };
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };
  const hasAutoAttendanceGeofence = list => {
    return Array.isArray(list) && list.some(g => g.autoAttendance?.checkIn || g.autoAttendance?.checkOut);
  };
  const toggleBackgroundTracking = async () => {
    try {
      if (backgroundTracking) {
        // Stop tracking
        Alert.alert('Stop Tracking?', 'This will stop recording your movements. You can view the history in the History > Movement tab.', [{
          text: 'Cancel',
          style: 'cancel'
        }, {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            await TeacherLiveTrackingService.stopTracking();
            setBackgroundTracking(false);
            setTrackingStats(null);
          }
        }]);
      } else {
        // Start tracking
        const result = await TeacherLiveTrackingService.startTracking();
        if (result.success) {
          setBackgroundTracking(true);
          const msg = result.foregroundOnly ? `Tracking active while app is open.\n\nTo enable background tracking, go to:\nSettings → Location → "Allow all the time"` : `Live tracking is active.\nGeofences registered: ${result.geofences || 0}.`;
          Alert.alert('Tracking Started', result.warning || msg, [{
            text: 'OK'
          }]);
          const stats = await TeacherLiveTrackingService.getStats();
          setTrackingStats(stats);
        } else {
          Alert.alert('Cannot Start Tracking', result.error || 'Failed to start tracking');
        }
      }
    } catch (error) {
      console.error('Error toggling tracking:', error);
      Alert.alert('Error', error.message);
    }
  };
  return <View style={[styles.container, {
    backgroundColor: theme.colors.background
  }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, {
      paddingTop: insets.top + 16,
      paddingBottom: insets.bottom + 96
    }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={`${user?.firstName} ${user?.lastName}`} size={50} source={getUserAvatarUri(user) ? {
            uri: getUserAvatarUri(user)
          } : null} />
            <View style={styles.headerText}>
              <Text style={[styles.greeting, {
              color: theme.colors.textSecondary
            }]}>
                {getGreeting()},
              </Text>
              <Text style={[styles.userName, {
              color: theme.colors.text
            }]}>
                {user?.firstName}!   👋
              </Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            {isConnected && <View style={[styles.connectionIndicator, {
            backgroundColor: theme.colors.success + '18'
          }]}>
                <View style={[styles.dot, {
              backgroundColor: theme.colors.success
            }]} />
              </View>}
            <TouchableOpacity style={[styles.bellButton, {
            backgroundColor: theme.colors.card
          }]} onPress={() => router.push('/notifications')} activeOpacity={0.7}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
              {unreadNotifications > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: theme.colors.error, borderColor: theme.colors.card }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Status Card */}
        <Card style={styles.statusCard} elevation="lg">
          <View style={styles.statusHeader}>
            <View style={styles.statusTitleContainer}>
              <View style={[styles.statusIconBadge, {
              backgroundColor: theme.colors.primary + '18'
            }]}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
              </View>
              <Text style={[styles.statusTitle, {
              color: theme.colors.text
            }]}>
                Today's Status
              </Text>
            </View>
            <View style={[styles.dateContainer, {
            backgroundColor: theme.colors.background
          }]}>
              <Text style={[styles.dateText, {
              color: theme.colors.textSecondary
            }]}>
                {format(new Date(), 'EEE, MMM dd')}
              </Text>
            </View>
          </View>
          {todayAttendance && <View style={styles.statusBadgeContainer}>
              <StatusBadge status={todayAttendance.status} size="small" />
            </View>}

          <View style={styles.statusContent}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Ionicons name="log-in-outline" size={18} color={theme.colors.success} />
                <Text style={[styles.statusLabel, {
                color: theme.colors.textSecondary
              }]}>
                  Check In
                </Text>
                <Text style={[styles.statusValue, {
                color: theme.colors.text
              }]}>
                  {formatTime(todayAttendance?.checkIn?.time)}
                </Text>
              </View>

              <View style={[styles.statusDivider, {
              backgroundColor: theme.colors.border
            }]} />

              <View style={styles.statusItem}>
                <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
                <Text style={[styles.statusLabel, {
                color: theme.colors.textSecondary
              }]}>
                  Check Out
                </Text>
                <Text style={[styles.statusValue, {
                color: theme.colors.text
              }]}>
                  {formatTime(todayAttendance?.checkOut?.time)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Check In/Out Button */}
        <View style={styles.checkInContainer}>
          {todayAttendance?.checkIn?.time && todayAttendance?.checkOut?.time ?
        // Already completed attendance for today
        <Card style={[styles.completedCard, {
          backgroundColor: theme.colors.success + '15',
          borderColor: theme.colors.success
        }]}>
              <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
              <Text style={[styles.completedText, {
            color: theme.colors.success
          }]}>
                Attendance Completed
              </Text>
              <Text style={[styles.completedSubtext, {
            color: theme.colors.textSecondary
          }]}>
                You've checked in and out for today
              </Text>
            </Card> : <CheckInButton isCheckedIn={isCheckedIn} onCheckIn={handleCheckIn} onCheckOut={handleCheckOut} disabled={isLoading} />}
        </View>

        {/* Monthly Stats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, {
            color: theme.colors.text
          }]}>
              This Month
            </Text>
            <TouchableOpacity onPress={() => router.push('/reports')}>
              <Text style={[styles.sectionLink, {
              color: theme.colors.primary
            }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <StatsCard icon="checkmark-done-circle" label="Present Days" value={stats?.presentDays || 0} color={theme.colors.success} subtitle={`${stats?.attendanceRate || 0}% attendance`} />

            <StatsCard icon="time" label="Late Days" value={stats?.lateDays || 0} color={theme.colors.warning} />

            <StatsCard icon="close-circle" label="Absent Days" value={stats?.absentDays || 0} color={theme.colors.error} />

            <StatsCard icon="briefcase" label="Working Hours" value={`${stats?.totalHours || 0}h`} color={theme.colors.info} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {
          color: theme.colors.text
        }]}>
            Quick Actions
          </Text>

          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickAction, {
            backgroundColor: theme.colors.card
          }]} onPress={() => router.push('/(tabs)/history')}>
              <Ionicons name="time-outline" size={28} color={theme.colors.primary} />
              <Text style={[styles.quickActionText, {
              color: theme.colors.text
            }]}>
                History
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickAction, {
            backgroundColor: theme.colors.card
          }]} onPress={() => router.push('/(tabs)/map')}>
              <Ionicons name="map-outline" size={28} color={theme.colors.success} />
              <Text style={[styles.quickActionText, {
              color: theme.colors.text
            }]}>
                Map
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickAction, {
            backgroundColor: theme.colors.card
          }]} onPress={() => router.push('/(tabs)/reports')}>
              <Ionicons name="stats-chart-outline" size={28} color={theme.colors.secondary} />
              <Text style={[styles.quickActionText, {
              color: theme.colors.text
            }]}>
                Reports
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickAction, {
            backgroundColor: theme.colors.card
          }]} onPress={() => router.push('/(tabs)/profile')}>
              <Ionicons name="person-outline" size={28} color={theme.colors.info} />
              <Text style={[styles.quickActionText, {
              color: theme.colors.text
            }]}>
                Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.quickAction, {
            backgroundColor: theme.colors.card
          }]} onPress={() => router.push('/movement-request')}>
              <Ionicons name="shield-checkmark-outline" size={28} color={theme.colors.warning} />
              <Text style={[styles.quickActionText, {
              color: theme.colors.text
            }]}>
                Access
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Auto Attendance / Work Schedule Info */}
        {(() => {
        const gf = geofences.find(g => g.autoAttendance?.checkIn || g.autoAttendance?.checkOut || g.workingHours?.enabled);
        const autoOn = gf && (gf.autoAttendance?.checkIn || gf.autoAttendance?.checkOut);
        return <View style={styles.section}>
              <Card style={[styles.scheduleCard, {
            backgroundColor: autoOn ? theme.colors.success + '10' : theme.colors.warning + '10',
            borderColor: autoOn ? theme.colors.success + '40' : theme.colors.warning + '40',
            borderWidth: 1
          }]}>
                <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 6
            }}>
                  <Ionicons name={autoOn ? 'shield-checkmark' : 'information-circle-outline'} size={20} color={autoOn ? theme.colors.success : theme.colors.warning} style={{
                marginRight: 8
              }} />
                  <Text style={[styles.scheduleTitle, {
                color: theme.colors.text
              }]}>
                    {autoOn ? 'Auto Attendance Active' : 'Auto Attendance'}
                  </Text>
                </View>
                {gf ? <>
                    {gf.workingHours?.enabled && <Text style={[styles.scheduleDetail, {
                color: theme.colors.textSecondary
              }]}>
                        Schedule: {gf.workingHours.startTime} – {gf.workingHours.endTime}
                      </Text>}
                    <Text style={[styles.scheduleDetail, {
                color: theme.colors.textSecondary
              }]}>
                      Check-In: {gf.autoAttendance?.checkIn ? '✓ Automatic on entry' : '✗ Manual only'}
                    </Text>
                    <Text style={[styles.scheduleDetail, {
                color: theme.colors.textSecondary
              }]}>
                      Check-Out: {gf.autoAttendance?.checkOut ? '✓ Automatic on exit' : '✗ Manual only'}
                    </Text>
                    {autoOn && <Text style={[styles.scheduleNote, {
                color: theme.colors.success
              }]}>
                        Needs Live Tracking plus Always location
                      </Text>}
                  </> : <Text style={[styles.scheduleDetail, {
              color: theme.colors.textSecondary
            }]}>
                    Admin has not configured auto check-in/out yet. Ask your admin to enable it in Geofence settings.
                  </Text>}
              </Card>
            </View>;
      })()}

        {/* Live Tracking */}
        <View style={styles.section}>
          <Card style={[styles.trackingCard, {
          backgroundColor: backgroundTracking ? theme.colors.success + '10' : theme.colors.card
        }]}>
            <View style={styles.trackingHeader}>
              <View style={styles.trackingTitleContainer}>
                <Ionicons name={backgroundTracking ? "footsteps" : "footsteps-outline"} size={24} color={backgroundTracking ? theme.colors.success : theme.colors.text} />
                <View style={styles.trackingTextContainer}>
                  <Text style={[styles.trackingTitle, {
                  color: theme.colors.text
                }]}>
                    Live Tracking
                  </Text>
                  <Text style={[styles.trackingSubtitle, {
                  color: theme.colors.textSecondary
                }]}>
                    {backgroundTracking ? 'Streaming movement to admin' : 'Use native geofencing'}
                  </Text>
                </View>
              </View>
              <Switch value={backgroundTracking} onValueChange={toggleBackgroundTracking} trackColor={{
              false: '#d1d5db',
              true: theme.colors.success + '40'
            }} thumbColor={backgroundTracking ? theme.colors.success : '#f3f4f6'} />
            </View>

            {backgroundTracking && trackingStats && <View style={[styles.trackingStats, {
            borderTopColor: theme.colors.border
          }]}>
                <View style={styles.trackingStat}>
                  <Text style={[styles.trackingStatLabel, {
                color: theme.colors.textSecondary
              }]}>
                    Total Points
                  </Text>
                  <Text style={[styles.trackingStatValue, {
                color: theme.colors.text
              }]}>
                    {trackingStats.total}
                  </Text>
                </View>
                <View style={styles.trackingStat}>
                  <Text style={[styles.trackingStatLabel, {
                color: theme.colors.textSecondary
              }]}>
                    Synced
                  </Text>
                  <Text style={[styles.trackingStatValue, {
                color: theme.colors.success
              }]}>
                    {trackingStats.synced}
                  </Text>
                </View>
                <View style={styles.trackingStat}>
                  <Text style={[styles.trackingStatLabel, {
                color: theme.colors.textSecondary
              }]}>
                    Pending
                  </Text>
                  <Text style={[styles.trackingStatValue, {
                color: theme.colors.warning
              }]}>
                    {trackingStats.unsynced}
                  </Text>
                </View>
                <View style={styles.trackingStat}>
                  <Text style={[styles.trackingStatLabel, {
                color: theme.colors.textSecondary
              }]}>
                    Geofences
                  </Text>
                  <Text style={[styles.trackingStatValue, {
                color: trackingStats.geofenceError ? theme.colors.error : theme.colors.text
              }]}>
                    {trackingStats.geofences}
                  </Text>
                </View>
              </View>}
            {trackingStats?.geofenceError && (
              <View style={[styles.trackingStats, { borderTopColor: theme.colors.border, justifyContent: 'flex-start' }]}>
                <Text style={{ color: theme.colors.error, fontSize: 12, fontWeight: '600' }}>
                  ❌ Geofence registration failed: {trackingStats.geofenceError}
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Auto Attendance Diagnostics — shows *why* the last geofence
            enter/exit did or didn't result in a check-in/out, since that
            used to fail silently. */}
        <View style={styles.section}>
          <Card style={styles.trackingCard}>
            <View style={styles.trackingHeader}>
              <View style={styles.trackingTitleContainer}>
                <Ionicons
                  name={lastAutoEvent?.success ? 'checkmark-circle' : lastAutoEvent?.skipped ? 'alert-circle' : lastAutoEvent ? 'close-circle' : 'help-circle-outline'}
                  size={24}
                  color={lastAutoEvent?.success ? theme.colors.success : lastAutoEvent?.skipped ? theme.colors.warning : lastAutoEvent ? theme.colors.error : theme.colors.textSecondary}
                />
                <View style={styles.trackingTextContainer}>
                  <Text style={[styles.trackingTitle, { color: theme.colors.text }]}>
                    Last Auto Check-In/Out
                  </Text>
                  <Text style={[styles.trackingSubtitle, { color: theme.colors.textSecondary }]}>
                    {!lastAutoEvent
                      ? 'No geofence enter/exit detected yet'
                      : `${lastAutoEvent.eventType === 'enter' ? 'Entered' : 'Exited'} at ${new Date(lastAutoEvent.timestamp).toLocaleTimeString()}`}
                  </Text>
                </View>
              </View>
            </View>
            {lastAutoEvent && (
              <View style={[styles.trackingStats, { borderTopColor: theme.colors.border, justifyContent: 'flex-start' }]}>
                <Text style={{
                  color: lastAutoEvent.success ? theme.colors.success : lastAutoEvent.skipped ? theme.colors.warning : theme.colors.error,
                  fontSize: 13,
                  fontWeight: '600',
                }}>
                  {lastAutoEvent.success
                    ? '✅ Attendance recorded'
                    : lastAutoEvent.skipped
                      ? `⚠️ Skipped: ${lastAutoEvent.reason || 'unknown reason'}`
                      : `❌ Failed: ${lastAutoEvent.reason || 'unknown error'}`}
                </Text>
              </View>
            )}
            {backgroundSubmitSupported !== null && (
              <View style={[styles.trackingStats, { borderTopColor: theme.colors.border, justifyContent: 'flex-start' }]}>
                <Text style={{
                  color: backgroundSubmitSupported ? theme.colors.success : theme.colors.warning,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {backgroundSubmitSupported
                    ? '✅ This build submits check-in/out even with the app fully closed'
                    : '⚠️ Old build — checks in only when app is reopened. Rebuild with eas build to update.'}
                </Text>
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </View>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerText: {
    marginLeft: 12
  },
  greeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular"
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  connectionIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  bellButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5
  },
  statusCard: {
    marginBottom: 24
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  statusTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusIcon: {
    marginRight: 8
  },
  statusIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  dateContainer: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  statusBadgeContainer: {
    alignSelf: 'flex-start',
    marginTop: 8
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  statusContent: {
    marginTop: 8
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16
  },
  statusItem: {
    flex: 1,
    alignItems: 'center'
  },
  statusLabel: {
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "Inter_400Regular"
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  statusDivider: {
    width: 1,
    marginHorizontal: 12
  },
  checkInContainer: {
    alignItems: 'center',
    marginVertical: 32
  },
  completedCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    marginVertical: 32
  },
  completedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  completedSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
    fontFamily: "Inter_400Regular"
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  quickAction: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold",
    marginTop: 8
  },
  trackingCard: {
    padding: 16
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  trackingTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  trackingTextContainer: {
    flex: 1
  },
  trackingTitle: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  trackingSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: "Inter_400Regular"
  },
  trackingStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12
  },
  trackingStat: {
    flex: 1,
    alignItems: 'center'
  },
  trackingStatLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontFamily: "Inter_400Regular"
  },
  trackingStatValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  scheduleCard: {
    padding: 14,
    borderRadius: 12
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  scheduleDetail: {
    fontSize: 13,
    marginTop: 4,
    fontFamily: "Inter_400Regular"
  },
  scheduleNote: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
    fontFamily: "Inter_500Medium"
  }
});
