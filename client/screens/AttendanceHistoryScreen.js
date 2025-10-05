import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Alert,
} from 'react-native';
import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import CommonHeader from '../components/CommonHeader';
import { Colors, CommonStyles } from '../theme/Colors';

const { width } = Dimensions.get('window');

export default function AttendanceHistoryScreen({ navigation }) {
  const [selectedFilter, setSelectedFilter] = useState('week');
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    loadAttendanceData();
  }, [selectedFilter]);

  const loadAttendanceData = () => {
    // Dummy attendance history data
    const dummyData = [
      {
        id: 1,
        date: '2024-10-05',
        day: 'Today',
        classes: [
          { subject: 'Mathematics 101', status: 'present', time: '09:15 AM', method: 'geo' },
          { subject: 'Physics 201', status: 'present', time: '11:30 AM', method: 'qr' },
          { subject: 'Chemistry 301', status: 'pending', time: '02:00 PM', method: null },
        ]
      },
      {
        id: 2,
        date: '2024-10-04',
        day: 'Yesterday',
        classes: [
          { subject: 'Mathematics 101', status: 'present', time: '09:12 AM', method: 'geo' },
          { subject: 'Physics 201', status: 'absent', time: null, method: null },
          { subject: 'Chemistry 301', status: 'present', time: '02:05 PM', method: 'qr' },
        ]
      },
      {
        id: 3,
        date: '2024-10-03',
        day: 'Thursday',
        classes: [
          { subject: 'Mathematics 101', status: 'present', time: '09:18 AM', method: 'geo' },
          { subject: 'Physics 201', status: 'present', time: '11:25 AM', method: 'geo' },
          { subject: 'Chemistry 301', status: 'present', time: '02:02 PM', method: 'qr' },
        ]
      },
      {
        id: 4,
        date: '2024-10-02',
        day: 'Wednesday',
        classes: [
          { subject: 'Mathematics 101', status: 'present', time: '09:20 AM', method: 'qr' },
          { subject: 'Physics 201', status: 'present', time: '11:32 AM', method: 'geo' },
          { subject: 'Chemistry 301', status: 'absent', time: null, method: null },
        ]
      },
      {
        id: 5,
        date: '2024-10-01',
        day: 'Tuesday',
        classes: [
          { subject: 'Mathematics 101', status: 'present', time: '09:10 AM', method: 'geo' },
          { subject: 'Physics 201', status: 'present', time: '11:28 AM', method: 'qr' },
          { subject: 'Chemistry 301', status: 'present', time: '02:08 PM', method: 'geo' },
        ]
      },
    ];

    setAttendanceData(dummyData);
    
    // Calculate stats
    const totalClasses = dummyData.reduce((total, day) => total + day.classes.length, 0);
    const presentClasses = dummyData.reduce((total, day) => 
      total + day.classes.filter(cls => cls.status === 'present').length, 0
    );
    const absentClasses = dummyData.reduce((total, day) => 
      total + day.classes.filter(cls => cls.status === 'absent').length, 0
    );
    const pendingClasses = dummyData.reduce((total, day) => 
      total + day.classes.filter(cls => cls.status === 'pending').length, 0
    );

    setStats({
      total: totalClasses,
      present: presentClasses,
      absent: absentClasses,
      pending: pendingClasses,
      percentage: totalClasses > 0 ? Math.round((presentClasses / (totalClasses - pendingClasses)) * 100) : 0
    });
  };

  const filters = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'semester', label: 'Semester' },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return Colors.success;
      case 'absent':
        return Colors.error;
      case 'pending':
        return Colors.warning;
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return 'check-circle';
      case 'absent':
        return 'times-circle';
      case 'pending':
        return 'clock';
      default:
        return 'question-circle';
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'geo':
        return 'map-marker-alt';
      case 'qr':
        return 'qrcode';
      default:
        return null;
    }
  };

  const renderAttendanceDay = ({ item }) => (
    <View style={styles.dayCard}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayName}>{item.day}</Text>
        <Text style={styles.dayDate}>{item.date}</Text>
      </View>
      
      {item.classes.map((classItem, index) => (
        <View key={index} style={styles.classRow}>
          <View style={styles.classInfo}>
            <Text style={styles.className}>{classItem.subject}</Text>
            {classItem.time && (
              <View style={styles.classTimeContainer}>
                {getMethodIcon(classItem.method) && (
                  <FontAwesome5 
                    name={getMethodIcon(classItem.method)} 
                    size={12} 
                    color={Colors.textSecondary} 
                  />
                )}
                <Text style={styles.classTime}>{classItem.time}</Text>
              </View>
            )}
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(classItem.status) }]}>
            <FontAwesome5 
              name={getStatusIcon(classItem.status)} 
              size={12} 
              color={Colors.surface} 
            />
            <Text style={styles.statusText}>{classItem.status.toUpperCase()}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <CommonHeader
        title="Attendance History"
        subtitle="Track your class attendance"
        showBack={true}
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={() => Alert.alert('Export', 'Export functionality coming soon!')}>
            <FontAwesome5 name="download" size={20} color={Colors.surface} />
          </TouchableOpacity>
        }
      />

      <View style={styles.content}>
        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {filters.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.activeFilterTab
              ]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  selectedFilter === filter.key && styles.activeFilterTabText
                ]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Statistics Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <FontAwesome5 name="book-open" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Classes</Text>
          </View>
          
          <View style={styles.statCard}>
            <FontAwesome5 name="check-circle" size={24} color={Colors.success} />
            <Text style={styles.statNumber}>{stats.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          
          <View style={styles.statCard}>
            <FontAwesome5 name="times-circle" size={24} color={Colors.error} />
            <Text style={styles.statNumber}>{stats.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
          
          <View style={styles.statCard}>
            <FontAwesome5 name="clock" size={24} color={Colors.warning} />
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          
          <View style={styles.statCard}>
            <FontAwesome5 name="percentage" size={24} color={Colors.info} />
            <Text style={styles.statNumber}>{stats.percentage}%</Text>
            <Text style={styles.statLabel}>Attendance Rate</Text>
          </View>
        </ScrollView>

        {/* Attendance Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Overall Progress</Text>
            <Text style={styles.progressPercentage}>{stats.percentage}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: stats.percentage + '%',
                  backgroundColor: stats.percentage >= 75 ? Colors.success : 
                                   stats.percentage >= 50 ? Colors.warning : Colors.error
                }
              ]} 
            />
          </View>
          <View style={styles.progressTextContainer}>
            {stats.percentage >= 75 ? (
              <>
                <FontAwesome5 name="trophy" size={16} color={Colors.success} />
                <Text style={[styles.progressText, { color: Colors.success }]}>
                  Excellent attendance!
                </Text>
              </>
            ) : stats.percentage >= 50 ? (
              <>
                <FontAwesome5 name="exclamation-triangle" size={16} color={Colors.warning} />
                <Text style={[styles.progressText, { color: Colors.warning }]}>
                  Good, but can improve
                </Text>
              </>
            ) : (
              <>
                <FontAwesome5 name="exclamation-circle" size={16} color={Colors.error} />
                <Text style={[styles.progressText, { color: Colors.error }]}>
                  Attendance below minimum requirement
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Attendance List */}
        <FlatList
          data={attendanceData}
          renderItem={renderAttendanceDay}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />

        {/* Export Button */}
        <TouchableOpacity 
          style={styles.exportButton}
          onPress={() => Alert.alert('Export Report', 'Export functionality coming soon!')}
        >
          <FontAwesome5 name="file-export" size={20} color={Colors.surface} />
          <Text style={styles.exportButtonText}>Export Report</Text>
        </TouchableOpacity>
      </View>
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
    ...CommonStyles.shadow,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: Colors.surface,
    fontWeight: 'bold',
  },
  statsContainer: {
    marginTop: 20,
  },
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginRight: 15,
    minWidth: 120,
    alignItems: 'center',
    ...CommonStyles.shadow,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  progressContainer: {
    backgroundColor: Colors.surface,
    marginTop: 20,
    borderRadius: 15,
    padding: 20,
    ...CommonStyles.shadow,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.background,
    borderRadius: 4,
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContainer: {
    paddingBottom: 20,
  },
  dayCard: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginTop: 15,
    ...CommonStyles.shadow,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  dayDate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  classTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  classTime: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  exportButton: {
    ...CommonStyles.primaryButton,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  exportButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
