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

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Load dummy data
    loadDummyData();

    return () => clearInterval(timer);
  }, []);

  const loadDummyData = () => {
    // Dummy attendance data
    setTodayAttendance({
      present: true,
      checkInTime: '09:15 AM',
      status: 'Present',
      location: 'Main Campus - Room 101',
    });

    setWeeklyStats({
      totalClasses: 25,
      attended: 22,
      percentage: 88,
      streak: 5,
    });
  };

  const quickActions = [
    {
      id: 1,
      title: 'Mark Attendance',
      subtitle: 'Geo or QR Code',
      icon: '📝',
      color: '#4CAF50',
      action: () => navigation.navigate('Attendance'),
    },
    {
      id: 2,
      title: 'Scan QR Code',
      subtitle: 'Quick Check-in',
      icon: '📱',
      color: '#2196F3',
      action: () => navigation.navigate('QRScanner'),
    },
    {
      id: 3,
      title: 'View History',
      subtitle: 'Past Records',
      icon: '📊',
      color: '#FF9800',
      action: () => navigation.navigate('History'),
    },
    {
      id: 4,
      title: 'Profile',
      subtitle: 'My Account',
      icon: '👤',
      color: '#9C27B0',
      action: () => navigation.navigate('Profile'),
    },
  ];

  const upcomingClasses = [
    { id: 1, subject: 'Mathematics', time: '10:00 AM', room: 'Room 101', teacher: 'Prof. Smith' },
    { id: 2, subject: 'Physics', time: '11:30 AM', room: 'Lab 201', teacher: 'Dr. Johnson' },
    { id: 3, subject: 'Chemistry', time: '02:00 PM', room: 'Lab 301', teacher: 'Prof. Brown' },
  ];

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning! 👋</Text>
          <Text style={styles.userName}>John Doe</Text>
          <Text style={styles.date}>{formatDate(currentTime)}</Text>
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.time}>{formatTime(currentTime)}</Text>
        </View>
      </View>

      {/* Today's Attendance Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        {todayAttendance ? (
          <View style={styles.attendanceStatus}>
            <View style={[styles.statusBadge, { backgroundColor: todayAttendance.present ? '#4CAF50' : '#F44336' }]}>
              <Text style={styles.statusText}>
                {todayAttendance.present ? '✅ Present' : '❌ Absent'}
              </Text>
            </View>
            <View style={styles.attendanceDetails}>
              <Text style={styles.detailText}>Check-in: {todayAttendance.checkInTime}</Text>
              <Text style={styles.detailText}>Location: {todayAttendance.location}</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.markAttendanceButton}
            onPress={() => navigation.navigate('Attendance')}
          >
            <Text style={styles.markAttendanceText}>📍 Mark Today's Attendance</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Weekly Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This Week's Statistics</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{weeklyStats.attended}</Text>
            <Text style={styles.statLabel}>Classes Attended</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{weeklyStats.percentage}%</Text>
            <Text style={styles.statLabel}>Attendance Rate</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{weeklyStats.streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
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
              onPress={action.action}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Upcoming Classes */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming Classes</Text>
        {upcomingClasses.map((classItem) => (
          <View key={classItem.id} style={styles.classItem}>
            <View style={styles.classTime}>
              <Text style={styles.classTimeText}>{classItem.time}</Text>
            </View>
            <View style={styles.classDetails}>
              <Text style={styles.classSubject}>{classItem.subject}</Text>
              <Text style={styles.classInfo}>{classItem.room} • {classItem.teacher}</Text>
            </View>
            <TouchableOpacity style={styles.classAction}>
              <Text style={styles.classActionText}>📍</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Recent Notifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Notifications</Text>
        <View style={styles.notification}>
          <Text style={styles.notificationIcon}>🔔</Text>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Attendance Reminder</Text>
            <Text style={styles.notificationText}>Don't forget to mark your attendance for today's classes</Text>
            <Text style={styles.notificationTime}>2 hours ago</Text>
          </View>
        </View>
        <View style={styles.notification}>
          <Text style={styles.notificationIcon}>⚠️</Text>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationTitle}>Low Attendance Warning</Text>
            <Text style={styles.notificationText}>Your attendance is below 85%. Please attend regularly.</Text>
            <Text style={styles.notificationTime}>1 day ago</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2196F3',
  },
  greeting: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
  date: {
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    marginTop: 2,
  },
  timeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    padding: 10,
  },
  time: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    marginBottom: 0,
    borderRadius: 15,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  attendanceStatus: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginBottom: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendanceDetails: {
    alignItems: 'center',
  },
  detailText: {
    color: '#666',
    fontSize: 14,
    marginVertical: 2,
  },
  markAttendanceButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  markAttendanceText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 70) / 2,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  actionSubtitle: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 2,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  classTime: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginRight: 15,
    minWidth: 70,
  },
  classTimeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2196F3',
    textAlign: 'center',
  },
  classDetails: {
    flex: 1,
  },
  classSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  classInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  classAction: {
    padding: 10,
  },
  classActionText: {
    fontSize: 18,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationIcon: {
    fontSize: 20,
    marginRight: 15,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  notificationText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    lineHeight: 16,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 5,
  },
});