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
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { Colors, CommonStyles } from '../theme/Colors';

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
        icon: 'check-circle',
        color: Colors.success,
      },
      {
        id: 2,
        type: 'alert',
        message: 'Low attendance alert for Physics 201',
        time: '1 hour ago',
        icon: 'exclamation-triangle',
        color: Colors.warning,
      },
      {
        id: 3,
        type: 'new_user',
        message: 'New student Sarah Johnson registered',
        time: '2 hours ago',
        icon: 'user-plus',
        color: Colors.info,
      },
      {
        id: 4,
        type: 'report',
        message: 'Weekly attendance report generated',
        time: '4 hours ago',
        icon: 'file-alt',
        color: Colors.primary,
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
      icon: 'school',
      color: Colors.success,
      action: () => navigation.navigate('ClassManagement'),
    },
    {
      id: 2,
      title: 'User Management',
      subtitle: 'Manage students & teachers',
      icon: 'users',
      color: Colors.primary,
      action: () => Alert.alert('User Management', 'User management feature coming soon!'),
    },
    {
      id: 3,
      title: 'Reports',
      subtitle: 'Generate attendance reports',
      icon: 'chart-bar',
      color: Colors.warning,
      action: () => Alert.alert('Reports', 'Advanced reporting features coming soon!'),
    },
    {
      id: 4,
      title: 'Settings',
      subtitle: 'System configuration',
      icon: 'cogs',
      color: Colors.info,
      action: () => Alert.alert('Settings', 'Admin settings coming soon!'),
    },
    {
      id: 5,
      title: 'Notifications',
      subtitle: 'Send announcements',
      icon: 'bullhorn',
      color: Colors.error,
      action: () => Alert.alert('Notifications', 'Notification system coming soon!'),
    },
    {
      id: 6,
      title: 'Analytics',
      subtitle: 'View detailed analytics',
      icon: 'chart-line',
      color: Colors.secondary,
      action: () => Alert.alert('Analytics', 'Analytics dashboard coming soon!'),
    },
  ];

  const getAttendanceColor = (percentage) => {
    if (percentage >= 80) return Colors.success;
    if (percentage >= 60) return Colors.warning;
    return Colors.error;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return Colors.error;
      case 'warning':
        return Colors.warning;
      default:
        return Colors.success;
    }
  };

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Admin Dashboard"
        subtitle="Manage your institution"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => Alert.alert('Settings', 'Admin settings coming soon!')}>
            <FontAwesome5 name="cog" size={20} color={Colors.surface} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dashboard Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <FontAwesome5 name="user-graduate" size={28} color={Colors.success} />
              <Text style={styles.statNumber}>{dashboardStats.totalStudents}</Text>
              <Text style={styles.statLabel}>Total Students</Text>
            </View>
            
            <View style={styles.statCard}>
              <FontAwesome5 name="chalkboard-teacher" size={28} color={Colors.primary} />
              <Text style={styles.statNumber}>{dashboardStats.totalTeachers}</Text>
              <Text style={styles.statLabel}>Total Teachers</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <FontAwesome5 name="book-open" size={28} color={Colors.warning} />
              <Text style={styles.statNumber}>{dashboardStats.totalClasses}</Text>
              <Text style={styles.statLabel}>Total Classes</Text>
            </View>
            
            <View style={styles.statCard}>
              <FontAwesome5 name="chart-pie" size={28} color={Colors.info} />
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
              <FontAwesome5 name="play-circle" size={24} color={Colors.success} />
              <Text style={styles.quickStatNumber}>{dashboardStats.activeClasses}</Text>
              <Text style={styles.quickStatLabel}>Active Classes</Text>
            </View>
            
            <View style={styles.quickStatItem}>
              <FontAwesome5 name="clipboard-list" size={24} color={Colors.warning} />
              <Text style={styles.quickStatNumber}>{dashboardStats.pendingReports}</Text>
              <Text style={styles.quickStatLabel}>Pending Reports</Text>
            </View>
            
            <View style={styles.quickStatItem}>
              <FontAwesome5 name="exclamation-triangle" size={24} color={Colors.error} />
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
                <FontAwesome5 name={action.icon} size={24} color={Colors.surface} />
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
              <View style={[styles.activityIconContainer, { backgroundColor: activity.color + '20' }]}>
                <FontAwesome5 name={activity.icon} size={16} color={activity.color} />
              </View>
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
              <View style={styles.studentAvatar}>
                <FontAwesome5 name="user" size={16} color={Colors.textSecondary} />
              </View>
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
            <View style={styles.statusIconContainer}>
              <FontAwesome5 name="server" size={16} color={Colors.success} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Server Status</Text>
              <Text style={styles.statusSubtitle}>All systems operational</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: Colors.success }]} />
          </View>
          
          <View style={styles.statusItem}>
            <View style={styles.statusIconContainer}>
              <FontAwesome5 name="database" size={16} color={Colors.success} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Database</Text>
              <Text style={styles.statusSubtitle}>Connected and synced</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: Colors.success }]} />
          </View>
          
          <View style={styles.statusItem}>
            <View style={styles.statusIconContainer}>
              <FontAwesome5 name="bell" size={16} color={Colors.success} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Notifications</Text>
              <Text style={styles.statusSubtitle}>Service active</Text>
            </View>
            <View style={[styles.statusIndicator, { backgroundColor: Colors.success }]} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: Colors.success }]}
            onPress={() => Alert.alert('Export', 'Export functionality coming soon!')}
          >
            <FontAwesome5 name="file-export" size={16} color={Colors.surface} />
            <Text style={styles.quickActionText}>Export Today's Report</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.quickActionButton, { backgroundColor: Colors.warning }]}
            onPress={() => Alert.alert('Announcement', 'Announcement system coming soon!')}
          >
            <FontAwesome5 name="bullhorn" size={16} color={Colors.surface} />
            <Text style={styles.quickActionText}>Send Announcement</Text>
          </TouchableOpacity>
        </View>
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
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    ...CommonStyles.shadow,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 15,
    padding: 20,
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
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    ...CommonStyles.shadow,
  },
  actionTitle: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  actionSubtitle: {
    color: Colors.surface,
    fontSize: 12,
    opacity: 0.9,
    textAlign: 'center',
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  studentAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  studentClass: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statusIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statusSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    ...CommonStyles.shadow,
  },
  quickActionText: {
    color: Colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});
