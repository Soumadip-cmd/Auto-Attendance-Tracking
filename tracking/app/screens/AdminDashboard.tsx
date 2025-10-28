import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../utils/api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/api/admin/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Admin Panel</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {dashboard && (
          <>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="people" size={32} color="#2563EB" />
                <Text style={styles.statValue}>{dashboard.statistics.total_students}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="person" size={32} color="#16A34A" />
                <Text style={styles.statValue}>{dashboard.statistics.total_teachers}</Text>
                <Text style={styles.statLabel}>Teachers</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="school" size={32} color="#CA8A04" />
                <Text style={styles.statValue}>{dashboard.statistics.total_classes}</Text>
                <Text style={styles.statLabel}>Classes</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="warning" size={32} color="#DC2626" />
                <Text style={styles.statValue}>{dashboard.statistics.flagged_attendance}</Text>
                <Text style={styles.statLabel}>Flagged</Text>
              </View>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/(app)/create' as any)}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.createButtonText}>Create New Class</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Flagged Attendance</Text>
              {dashboard.recent_flagged.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
                  <Text style={styles.emptyStateText}>No flagged attendance</Text>
                </View>
              ) : (
                dashboard.recent_flagged.slice(0, 10).map((record: any) => (
                  <View key={record._id} style={styles.flaggedCard}>
                    <View style={styles.flaggedHeader}>
                      <View style={styles.flaggedIcon}>
                        <Ionicons name="warning" size={20} color="#DC2626" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.flaggedStudent}>{record.student_name}</Text>
                        <Text style={styles.flaggedClass}>{record.class_name}</Text>
                      </View>
                    </View>
                    <Text style={styles.flaggedReason}>{record.flag_reason}</Text>
                    <Text style={styles.flaggedTime}>
                      {new Date(record.timestamp).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Attendance by Class</Text>
              {dashboard.attendance_by_class.map((item: any, index: number) => (
                <View key={index} style={styles.attendanceCard}>
                  <View style={styles.attendanceHeader}>
                    <Text style={styles.attendanceClass}>{item._id || 'Unknown Class'}</Text>
                    <Text style={styles.attendanceCount}>{item.count} records</Text>
                  </View>
                  {item.flagged > 0 && (
                    <View style={styles.attendanceWarning}>
                      <Ionicons name="warning-outline" size={16} color="#EF4444" />
                      <Text style={styles.attendanceWarningText}>
                        {item.flagged} flagged attendance
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 16,
    color: '#6B7280',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 4,
  },
  logoutButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  quickActions: {
    padding: 24,
    paddingTop: 8,
  },
  createButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  flaggedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  flaggedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  flaggedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  flaggedStudent: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  flaggedClass: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  flaggedReason: {
    fontSize: 14,
    color: '#EF4444',
    marginBottom: 8,
  },
  flaggedTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceClass: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  attendanceCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  attendanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  attendanceWarningText: {
    fontSize: 14,
    color: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
});
