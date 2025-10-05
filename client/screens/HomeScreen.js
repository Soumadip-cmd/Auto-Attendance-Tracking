import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { Colors, CommonStyles } from '../theme/Colors';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState({});
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Load dummy data
    loadDummyData();

    return () => clearInterval(timer);
  }, []);

  const loadDummyData = () => {
    // Today's attendance status
    setTodayAttendance({
      present: true,
      checkInTime: '09:15 AM',
      status: 'Present',
      location: 'Main Campus - Room 101',
    });

    // Weekly stats
    setWeeklyStats({
      totalClasses: 25,
      attended: 22,
      percentage: 88,
      streak: 5,
    });

    // Upcoming classes
    setUpcomingClasses([
      {
        id: 1,
        subject: 'Mathematics 101',
        teacher: 'Prof. Smith',
        room: 'Room 101',
        time: '10:00 AM',
        status: 'upcoming',
      },
      {
        id: 2,
        subject: 'Physics 201',
        teacher: 'Dr. Johnson',
        room: 'Lab 201',
        time: '11:30 AM',
        status: 'upcoming',
      },
      {
        id: 3,
        subject: 'Chemistry 301',
        teacher: 'Prof. Brown',
        room: 'Lab 301',
        time: '02:00 PM',
        status: 'upcoming',
      },
    ]);

    // Notifications
    setNotifications([
      {
        id: 1,
        type: 'reminder',
        title: 'Mathematics 101 in 30 minutes',
        message: 'Don\u0027t forget your upcoming class',
        time: '30 min ago',
        icon: 'clock',
      },
      {
        id: 2,
        type: 'warning',
        title: 'Attendance Alert',
        message: 'Your attendance is below 85%. Please attend regularly.',
        time: '1 day ago',
        icon: 'warning',
      },
    ]);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const quickActions = [
    {
      id: 1,
      title: 'Mark Attendance',
      subtitle: 'Geo or QR Code',
      icon: 'map-marker-check',
      color: Colors.primary,
      onPress: () => navigation.navigate('Attendance'),
    },
    {
      id: 2,
      title: 'Scan QR Code',
      subtitle: 'Quick Check-in',
      icon: 'qrcode-scan',
      color: Colors.success,
      onPress: () => navigation.navigate('QRScanner'),
    },
    {
      id: 3,
      title: 'View History',
      subtitle: 'Attendance Records',
      icon: 'history',
      color: Colors.warning,
      onPress: () => navigation.navigate('AttendanceHistory'),
    },
    {
      id: 4,
      title: 'Profile',
      subtitle: 'Account Settings',
      icon: 'user-circle',
      color: Colors.secondary,
      onPress: () => navigation.navigate('Profile'),
    },
  ];

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { text: 'Good Morning!', icon: 'sun' };
    if (hour < 17) return { text: 'Good Afternoon!', icon: 'sun' };
    return { text: 'Good Evening!', icon: 'moon' };
  };

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      <CommonHeader
        title={greeting.text}
        subtitle={formatDate(currentTime) + '  ' + formatTime(currentTime)}
        showBack={false}
        rightComponent={
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => navigation.navigate('Profile')}
          >
            <FontAwesome5 name="user-circle" size={24} color={Colors.surface} />
          </TouchableOpacity>
        }
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Today's Attendance Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Attendance</Text>
          
          {todayAttendance ? (
            <View style={styles.attendanceStatus}>
              <View style={styles.statusHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: Colors.success }]}>
                  <FontAwesome5 name="check" size={16} color="white" />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusText}>You're marked present!</Text>
                  <Text style={styles.statusTime}>Check-in: {todayAttendance.checkInTime}</Text>
                </View>
              </View>
              <Text style={styles.statusLocation}> {todayAttendance.location}</Text>
            </View>
          ) : (
            <View style={styles.attendanceStatus}>
              <View style={styles.statusHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: Colors.warning }]}>
                  <FontAwesome5 name="clock" size={16} color="white" />
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusText}>No attendance marked yet</Text>
                  <Text style={styles.statusTime}>Tap to mark attendance</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Weekly Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This Week's Overview</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{weeklyStats.totalClasses}</Text>
              <Text style={styles.statLabel}>Total Classes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{weeklyStats.attended}</Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>
                {weeklyStats.percentage}%
              </Text>
              <Text style={styles.statLabel}>Attendance</Text>
            </View>
          </View>

          <View style={styles.streakContainer}>
            <FontAwesome5 name="fire" size={20} color={Colors.warning} />
            <Text style={styles.streakText}>
              {weeklyStats.streak} day attendance streak! 
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionButton, { backgroundColor: action.color }]}
                onPress={action.onPress}
              >
                <FontAwesome5 name={action.icon} size={24} color="white" />
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Classes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Upcoming Classes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Attendance')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {upcomingClasses.map((classItem) => (
            <View key={classItem.id} style={styles.classItem}>
              <View style={styles.classTime}>
                <Text style={styles.timeText}>{classItem.time}</Text>
              </View>
              <View style={styles.classDetails}>
                <Text style={styles.className}>{classItem.subject}</Text>
                <Text style={styles.classTeacher}>{classItem.teacher}</Text>
                <Text style={styles.classRoom}> {classItem.room}</Text>
              </View>
              <TouchableOpacity 
                style={styles.classAction}
                onPress={() => navigation.navigate('Attendance')}
              >
                <FontAwesome5 name="chevron-right" size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Notifications</Text>
          
          {notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationItem}>
              <View style={[
                styles.notificationIcon,
                { backgroundColor: notification.type === 'warning' ? Colors.warning : Colors.primary }
              ]}>
                <FontAwesome5 
                  name={notification.icon} 
                  size={14} 
                  color="white" 
                />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <Text style={styles.notificationTime}>{notification.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileButton: {
    padding: 5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    ...CommonStyles.shadow,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  attendanceStatus: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  statusTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 44,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginLeft: 8,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 80) / 2,
    aspectRatio: 1,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    ...CommonStyles.shadow,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 12,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: 'white',
    opacity: 0.8,
    marginTop: 4,
    textAlign: 'center',
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  classTime: {
    width: 60,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  classDetails: {
    flex: 1,
    marginLeft: 15,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  classTeacher: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  classRoom: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  classAction: {
    padding: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  notificationIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
});
