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

export default function AdminDashboardScreen({ navigation }) {
  const [dashboardStats, setDashboardStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [lowAttendanceStudents, setLowAttendanceStudents] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    // Dummy dashboard statistics
    setDashboardStats({
      totalStudents: 1234,
      totalTeachers: 87,
      totalClasses: 156,
      todayAttendance: 89.5,
      activeClasses: 12,
      pendingReports: 5,
    });

    // Dummy recent activity
    setRecentActivity([
      {
        id: 1,
        type: 'attendance',
        message: 'John Doe marked present in Mathematics 101',
        time: '10 minutes ago',
        icon: '✅',
      },
      {
        id: 2,
        type: 'alert',
        message: 'Low attendance alert for Physics 201',
        time: '1 hour ago',
        icon: '⚠️',
      },
      {
        id: 3,
        type: 'new_user',
        message: 'New student Sarah Johnson registered',
        time: '2 hours ago',
        icon: '👤',
      },
      {
        id: 4,
        type: 'report',
        message: 'Weekly attendance report generated',
        time: '4 hours ago',
        icon: '📊',
      },
    ]);

    // Dummy low attendance students
    setLowAttendanceStudents([
      { id: 1, name: 'Alex Johnson', percentage: 45, class: 'CS-6th', status: 'critical' },
      { id: 2, name: 'Maria Garcia', percentage: 62, class: 'CS-4th', status: 'warning' },
      { id: 3, name: 'David Brown', percentage: 58, class: 'CS-2nd', status: 'warning' },
    ]);
  };

  const adminActions = [
    {
      id: 1,
      title: 'Manage Classes',
      subtitle: 'Create, edit, delete classes',
      icon: '🏫',
      color: '#4CAF50',
      action: () => navigation.navigate('ClassManagement'),
    },
    {
      id: 2,
      title: 'User Management',
      subtitle: 'Manage students & teachers',
      icon: '👥',
      color: '#2196F3',
      action: () => Alert.alert('User Management', 'User management feature coming soon!'),
    },
    {
      id: 3,
      title: 'Reports',
      subtitle: 'Generate attendance reports',
      icon: '📊',
      color: '#FF9800',
      action: () => Alert.alert('Reports', 'Advanced reporting features coming soon!'),
    },
    {
      id: 4,
      title: 'Settings',
      subtitle: 'System configuration',
      icon: '⚙️',
      color: '#9C27B0',
      action: () => Alert.alert('Settings', 'Admin settings coming soon!'),
    },
    {
      id: 5,
      title: 'Notifications',
      subtitle: 'Send announcements',
      icon: '📢',
      color: '#F44336',
      action: () => Alert.alert('Notifications', 'Notification system coming soon!'),
    },
    {
      id: 6,
      title: 'Analytics',
      subtitle: 'View detailed analytics',
      icon: '📈',
      color: '#607D8B',
      action: () => Alert.alert('Analytics', 'Analytics dashboard coming soon!'),
    },
  ];

  const getAttendanceColor = (percentage) => {
    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 60) return '#FF9800';
    return '#F44336';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      default:
        return '#4CAF50';
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Manage your institution</Text>
      </View>

      {/* Dashboard Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.studentsCard]}>
            <Text style={styles.statNumber}>{dashboardStats.totalStudents}</Text>
            <Text style={styles.statLabel}>Total Students</Text>
          </View>
          
          <View style={[styles.statCard, styles.teachersCard]}>
            <Text style={styles.statNumber}>{dashboardStats.totalTeachers}</Text>
            <Text style={styles.statLabel}>Total Teachers</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.classesCard]}>
            <Text style={styles.statNumber}>{dashboardStats.totalClasses}</Text>
            <Text style={styles.statLabel}>Total Classes</Text>
          </View>
          
          <View style={[styles.statCard, styles.attendanceCard]}>
            <Text style={styles.statNumber}>{dashboardStats.todayAttendance}%</Text>
            <Text style={styles.statLabel}>Today's Attendance</Text>
          </View>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick Stats</Text>
        <View style={styles.quickStatsGrid}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatIcon}>📚</Text>
            <Text style={styles.quickStatNumber}>{dashboardStats.activeClasses}</Text>
            <Text style={styles.quickStatLabel}>Active Classes</Text>
          </View>
          
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatIcon}>📋</Text>
            <Text style={styles.quickStatNumber}>{dashboardStats.pendingReports}</Text>
            <Text style={styles.quickStatLabel}>Pending Reports</Text>
          </View>
          
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatIcon}>⚠️</Text>
            <Text style={styles.quickStatNumber}>{lowAttendanceStudents.length}</Text>
            <Text style={styles.quickStatLabel}>Low Attendance</Text>
          </View>
        </View>
      </View>

      {/* Admin Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Admin Actions</Text>
        <View style={styles.actionsGrid}>
          {adminActions.map((action) => (
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

      {/* Recent Activity */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {recentActivity.map((activity) => (
          <View key={activity.id} style={styles.activityItem}>
            <Text style={styles.activityIcon}>{activity.icon}</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityMessage}>{activity.message}</Text>
              <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Low Attendance Alerts */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Low Attendance Alerts</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        {lowAttendanceStudents.map((student) => (
          <View key={student.id} style={styles.studentAlert}>
            <View style={styles.studentInfo}>
              <Text style={styles.studentName}>{student.name}</Text>
              <Text style={styles.studentClass}>{student.class}</Text>
            </View>
            <View style={styles.attendanceInfo}>
              <Text style={[styles.attendancePercentage, { color: getStatusColor(student.status) }]}>
                {student.percentage}%
              </Text>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(student.status) }]} />
            </View>
          </View>
        ))}
      </View>

      {/* System Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>System Status</Text>
        
        <View style={styles.statusItem}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Server Status</Text>
            <Text style={styles.statusSubtitle}>All systems operational</Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
        
        <View style={styles.statusItem}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Database</Text>
            <Text style={styles.statusSubtitle}>Connected and synced</Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
        
        <View style={styles.statusItem}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Notifications</Text>
            <Text style={styles.statusSubtitle}>Service active</Text>
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: '#4CAF50' }]} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity style={[styles.quickActionButton, styles.exportButton]}>
          <Text style={styles.quickActionText}>📊 Export Today's Report</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.quickActionButton, styles.announcementButton]}>
          <Text style={styles.quickActionText}>📢 Send Announcement</Text>
        </TouchableOpacity>
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
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  statsContainer: {
    padding: 15,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  studentsCard: {
    borderTopWidth: 3,
    borderTopColor: '#4CAF50',
  },
  teachersCard: {
    borderTopWidth: 3,
    borderTopColor: '#2196F3',
  },
  classesCard: {
    borderTopWidth: 3,
    borderTopColor: '#FF9800',
  },
  attendanceCard: {
    borderTopWidth: 3,
    borderTopColor: '#9C27B0',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  quickStatLabel: {
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
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityIcon: {
    fontSize: 18,
    marginRight: 15,
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  studentAlert: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  studentClass: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  attendanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendancePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    padding: 15,
  },
  quickActionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  exportButton: {
    backgroundColor: '#4CAF50',
  },
  announcementButton: {
    backgroundColor: '#FF9800',
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});