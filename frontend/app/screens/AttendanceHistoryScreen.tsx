import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function AttendanceHistoryScreen() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const response = await api.get(`/api/attendance/student/${user?._id}`);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const presentCount = attendance.filter((a: any) => a.status === 'present').length;
  const flaggedCount = attendance.filter((a: any) => a.status === 'flagged').length;
  const totalCount = attendance.length;
  const attendancePercentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{presentCount}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{flaggedCount}</Text>
            <Text style={styles.statLabel}>Flagged</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4F46E5' }]}>{attendancePercentage}%</Text>
            <Text style={styles.statLabel}>Rate</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance History</Text>
          {attendance.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No attendance records yet</Text>
            </View>
          ) : (
            attendance.map((record: any) => (
              <View
                key={record._id}
                style={[
                  styles.attendanceCard,
                  record.flagged && styles.attendanceCardFlagged,
                ]}
              >
                <View style={styles.attendanceHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attendanceClass}>{record.class_name}</Text>
                    <Text style={styles.attendanceDate}>
                      {new Date(record.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: record.flagged ? '#FEE2E2' : '#D1FAE5',
                      },
                    ]}
                  >
                    <Ionicons
                      name={record.flagged ? 'warning' : 'checkmark-circle'}
                      size={16}
                      color={record.flagged ? '#DC2626' : '#059669'}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        {
                          color: record.flagged ? '#DC2626' : '#059669',
                        },
                      ]}
                    >
                      {record.status === 'present' ? 'Present' : 'Flagged'}
                    </Text>
                  </View>
                </View>
                <View style={styles.attendanceDetails}>
                  <View style={styles.attendanceDetail}>
                    <Ionicons name="navigate" size={14} color="#6B7280" />
                    <Text style={styles.attendanceDetailText}>
                      {record.method === 'geo' ? 'Geo-based' : 'QR Code'}
                    </Text>
                  </View>
                </View>
                {record.flagged && record.flag_reason && (
                  <View style={styles.flagReasonContainer}>
                    <Ionicons name="information-circle" size={16} color="#EF4444" />
                    <Text style={styles.flagReasonText}>{record.flag_reason}</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
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
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attendanceCardFlagged: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  attendanceClass: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  attendanceDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceDetails: {
    flexDirection: 'row',
    gap: 12,
  },
  attendanceDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendanceDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  flagReasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    gap: 8,
  },
  flagReasonText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
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
