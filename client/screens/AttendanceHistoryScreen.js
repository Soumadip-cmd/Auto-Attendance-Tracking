import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function AttendanceHistoryScreen() {
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
        return '#4CAF50';
      case 'absent':
        return '#F44336';
      case 'pending':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return '✅';
      case 'absent':
        return '❌';
      case 'pending':
        return '⏳';
      default:
        return '❓';
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'geo':
        return '🛰️';
      case 'qr':
        return '📱';
      default:
        return '';
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
              <Text style={styles.classTime}>
                {getMethodIcon(classItem.method)} {classItem.time}
              </Text>
            )}
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(classItem.status) }]}>
            <Text style={styles.statusText}>
              {getStatusIcon(classItem.status)} {classItem.status.toUpperCase()}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Attendance History</Text>
        <Text style={styles.headerSubtitle}>Track your class attendance</Text>
      </View>

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
        <View style={[styles.statCard, styles.totalCard]}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Classes</Text>
        </View>
        
        <View style={[styles.statCard, styles.presentCard]}>
          <Text style={styles.statNumber}>{stats.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        
        <View style={[styles.statCard, styles.absentCard]}>
          <Text style={styles.statNumber}>{stats.absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        
        <View style={[styles.statCard, styles.pendingCard]}>
          <Text style={styles.statNumber}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        
        <View style={[styles.statCard, styles.percentageCard]}>
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
                width: `${stats.percentage}%`,
                backgroundColor: stats.percentage >= 75 ? '#4CAF50' : stats.percentage >= 50 ? '#FF9800' : '#F44336'
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {stats.percentage >= 75 ? '🎉 Excellent attendance!' : 
           stats.percentage >= 50 ? '⚠️ Good, but can improve' : 
           '🚨 Attendance below minimum requirement'}
        </Text>
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
      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.exportButton}>
          <Text style={styles.exportButtonText}>📊 Export Report</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    padding: 5,
    elevation: 2,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeFilterTab: {
    backgroundColor: '#2196F3',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statsContainer: {
    marginTop: 15,
    paddingLeft: 15,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginRight: 15,
    minWidth: 100,
    alignItems: 'center',
    elevation: 2,
  },
  totalCard: {
    borderTopWidth: 3,
    borderTopColor: '#2196F3',
  },
  presentCard: {
    borderTopWidth: 3,
    borderTopColor: '#4CAF50',
  },
  absentCard: {
    borderTopWidth: 3,
    borderTopColor: '#F44336',
  },
  pendingCard: {
    borderTopWidth: 3,
    borderTopColor: '#FF9800',
  },
  percentageCard: {
    borderTopWidth: 3,
    borderTopColor: '#9C27B0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  progressContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 10,
    padding: 20,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    paddingHorizontal: 15,
  },
  dayCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dayDate: {
    fontSize: 14,
    color: '#666',
  },
  classRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  classTime: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  exportContainer: {
    padding: 15,
    backgroundColor: 'white',
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});