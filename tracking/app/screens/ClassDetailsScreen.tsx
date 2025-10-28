import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';

export default function ClassDetailsScreen({ route }: any) {
  const { classId } = route?.params || {};
  const { user } = useAuth();
  const router = useRouter();
  const [classData, setClassData] = useState<any>(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassDetails();
  }, []);

  const loadClassDetails = async () => {
    try {
      const [classResponse, attendanceResponse] = await Promise.all([
        api.get(`/api/class/${classId}`),
        api.get(`/api/attendance/class/${classId}`),
      ]);

      setClassData(classResponse.data);
      setAttendance(attendanceResponse.data);
    } catch (error) {
      console.error('Error loading class details:', error);
      Alert.alert('Error', 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  const regenerateQR = async () => {
    try {
      const response = await api.post(`/api/class/${classId}/qr`);
      setClassData({ ...classData, qr_code: response.data.qr_code });
      Alert.alert('Success', 'QR code regenerated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to regenerate QR code');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Class not found</Text>
      </View>
    );
  }

  const presentCount = attendance.filter((a: any) => a.status === 'present').length;
  const flaggedCount = attendance.filter((a: any) => a.status === 'flagged').length;
  const totalCount = attendance.length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.classInfo}>
          <Ionicons name="school" size={32} color="#4F46E5" />
          <View style={styles.classDetails}>
            <Text style={styles.className}>{classData.name}</Text>
            <Text style={styles.teacherName}>By {classData.teacher_name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.scheduleCard}>
          <View style={styles.scheduleRow}>
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <Text style={styles.scheduleText}>{classData.schedule.time}</Text>
          </View>
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.scheduleText}>{classData.schedule.days.join(', ')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geofence</Text>
        <View style={styles.geofenceCard}>
          <View style={styles.geofenceRow}>
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <View style={{ flex: 1 }}>
              <Text style={styles.geofenceText}>
                Lat: {classData.geofence.latitude.toFixed(6)}
              </Text>
              <Text style={styles.geofenceText}>
                Lng: {classData.geofence.longitude.toFixed(6)}
              </Text>
            </View>
          </View>
          <View style={styles.geofenceRow}>
            <Ionicons name="radio-outline" size={20} color="#6B7280" />
            <Text style={styles.geofenceText}>Radius: {classData.geofence.radius}m</Text>
          </View>
        </View>
      </View>

      {(user?.role === 'teacher' || user?.role === 'admin') && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Class Code</Text>
            <TouchableOpacity onPress={regenerateQR} style={styles.regenerateButton}>
              <Ionicons name="refresh" size={20} color="#4F46E5" />
              <Text style={styles.regenerateText}>Regenerate</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.qrCard}>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{classData.qr_code}</Text>
            </View>
            <Text style={styles.qrHint}>Students can use this code to join the class</Text>
          </View>
        </View>
      )}

      {(user?.role === 'teacher' || user?.role === 'admin') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Statistics</Text>
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
          </View>
        </View>
      )}

      {(user?.role === 'teacher' || user?.role === 'admin') && attendance.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Attendance</Text>
          {attendance.slice(0, 10).map((record: any) => (
            <View
              key={record._id}
              style={[
                styles.attendanceCard,
                record.flagged && styles.attendanceCardFlagged,
              ]}
            >
              <View style={styles.attendanceHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attendanceStudent}>{record.student_name}</Text>
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
                </View>
              </View>
              {record.flagged && record.flag_reason && (
                <Text style={styles.flagReason}>{record.flag_reason}</Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classDetails: {
    marginLeft: 16,
    flex: 1,
  },
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  teacherName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    padding: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scheduleText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  geofenceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  geofenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  geofenceText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  qrCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  qrHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  regenerateText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
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
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  attendanceCardFlagged: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceStudent: {
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
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagReason: {
    fontSize: 13,
    color: '#DC2626',
    marginTop: 8,
  },
});
