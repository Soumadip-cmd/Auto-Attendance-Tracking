import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import api from '../utils/api';

export default function ApproveAttendanceScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [pendingAttendance, setPendingAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [remarks, setRemarks] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadPendingAttendance();
  }, []);

  const loadPendingAttendance = async () => {
    try {
      const response = await api.get('/api/attendance/pending');
      setPendingAttendance(response.data);
    } catch (error) {
      console.error('Error loading pending attendance:', error);
      Alert.alert('Error', 'Failed to load pending attendance');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingAttendance();
  };

  const handleApprove = async (record: any) => {
    setSelectedRecord(record);
    setRemarks('');
    setModalVisible(true);
  };

  const confirmApproval = async (status: 'approved' | 'rejected') => {
    try {
      await api.post('/api/attendance/approve', {
        attendance_id: selectedRecord._id,
        status: status,
        remarks: remarks || undefined,
      });

      Alert.alert(
        'Success',
        `Attendance ${status === 'approved' ? 'approved' : 'rejected'} successfully`
      );

      setModalVisible(false);
      setSelectedRecord(null);
      setRemarks('');
      loadPendingAttendance();
    } catch (error: any) {
      console.error('Error approving attendance:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Failed to process attendance');
    }
  };

  const checkLocation = (record: any) => {
    if (!record.location) {
      Alert.alert('No Location', 'This attendance was marked without location data');
      return;
    }

    Alert.alert(
      'Location Details',
      `Latitude: ${record.location.latitude}\nLongitude: ${record.location.longitude}\n\nMethod: ${record.method.toUpperCase()}\n${
        record.flagged ? `\nFlagged: ${record.flag_reason}` : ''
      }`
    );
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approve Attendance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {pendingAttendance.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#10B981" />
            <Text style={styles.emptyStateText}>No pending attendance</Text>
            <Text style={styles.emptyStateSubtext}>
              All attendance requests have been reviewed
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.countText}>
              {pendingAttendance.length} pending approval{pendingAttendance.length !== 1 ? 's' : ''}
            </Text>

            {pendingAttendance.map((record) => (
              <View
                key={record._id}
                style={[
                  styles.attendanceCard,
                  record.flagged && { borderLeftColor: '#EF4444', borderLeftWidth: 4 },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.studentInfo}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={24} color="#6C5CE7" />
                    </View>
                    <View>
                      <Text style={styles.studentName}>{record.student_name}</Text>
                      <Text style={styles.className}>{record.class_name}</Text>
                    </View>
                  </View>
                  {record.flagged && (
                    <View style={styles.flagBadge}>
                      <Ionicons name="warning" size={16} color="#EF4444" />
                      <Text style={styles.flagText}>Flagged</Text>
                    </View>
                  )}
                </View>

                <View style={styles.details}>
                  <View style={styles.detailRow}>
                    <Ionicons name="time-outline" size={18} color="#6B7280" />
                    <Text style={styles.detailText}>
                      {new Date(record.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons
                      name={record.method === 'geo' ? 'location' : 'qr-code'}
                      size={18}
                      color="#6B7280"
                    />
                    <Text style={styles.detailText}>
                      {record.method === 'geo' ? 'Geofence' : 'QR Code'}
                    </Text>
                  </View>
                  {record.flagged && (
                    <View style={[styles.detailRow, { backgroundColor: '#FEE2E2', padding: 8, borderRadius: 6, marginTop: 4 }]}>
                      <Ionicons name="information-circle" size={18} color="#EF4444" />
                      <Text style={[styles.detailText, { color: '#EF4444', flex: 1 }]}>
                        {record.flag_reason}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.actions}>
                  {record.location && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.locationButton]}
                      onPress={() => checkLocation(record)}
                    >
                      <Ionicons name="location-outline" size={20} color="#6C5CE7" />
                      <Text style={styles.locationButtonText}>Location</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => {
                      setSelectedRecord(record);
                      setRemarks('');
                      Alert.alert(
                        'Reject Attendance',
                        'Are you sure you want to mark this as absent?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Reject',
                            style: 'destructive',
                            onPress: () => confirmApproval('rejected'),
                          },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                    <Text style={styles.rejectButtonText}>Absent</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(record)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.approveButtonText}>Present</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Remarks Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Approve Attendance</Text>
            <Text style={styles.modalSubtitle}>
              Student: {selectedRecord?.student_name}
            </Text>

            <Text style={styles.inputLabel}>Remarks (Optional)</Text>
            <TextInput
              style={styles.remarksInput}
              placeholder="Add any remarks..."
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalApproveButton]}
                onPress={() => confirmApproval('approved')}
              >
                <Text style={styles.modalApproveText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  attendanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  className: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  flagText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  details: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  locationButton: {
    backgroundColor: '#EDE9FE',
    flex: 0.8,
  },
  locationButtonText: {
    color: '#6C5CE7',
    fontWeight: '600',
    fontSize: 14,
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  approveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 16,
  },
  modalApproveButton: {
    backgroundColor: '#10B981',
  },
  modalApproveText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
