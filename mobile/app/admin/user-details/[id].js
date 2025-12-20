import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useTheme } from '../../../src/hooks/useTheme';
import { Card } from '../../../src/components/common/Card';
import { Avatar } from '../../../src/components/common/Avatar';
import { Loading } from '../../../src/components/common/Loading';
import { StatusBadge } from '../../../src/components/attendance/StatusBadge';
import axios from 'axios';
import { config, APP_CONFIG } from '../../../src/constants/config';
import { secureStorage } from '../../../src/utils/storage';

const { width } = Dimensions.get('window');

export default function UserDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadUserDetails();
  }, [id]);

  const getAuthHeaders = async () => {
    const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const loadUserDetails = async () => {
    try {
      const headers = await getAuthHeaders();

      // Load user data
      const userResponse = await axios.get(
        `${config.API_URL}/users/${id}`,
        headers
      );

      if (userResponse.data.success) {
        setUser(userResponse.data.data);
      }

      // Load user attendance for current month
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(new Date());

      const attendanceResponse = await axios.get(
        `${config.API_URL}/attendance/history`,
        {
          ...headers,
          params: {
            userId: id,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }
      );

      if (attendanceResponse.data.success) {
        setAttendance(attendanceResponse.data.data);
      }

      // Calculate stats
      const totalDays = attendanceResponse.data.data.length;
      const presentDays = attendanceResponse.data.data.filter(
        (a) => a.status === 'present'
      ).length;
      const lateDays = attendanceResponse.data.data.filter(
        (a) => a.status === 'late'
      ).length;
      const absentDays = attendanceResponse.data.data.filter(
        (a) => a.status === 'absent'
      ).length;

      setStats({
        totalDays,
        presentDays,
        lateDays,
        absentDays,
        attendanceRate: totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading user details:', error);
      Alert.alert('Error', 'Failed to load user details');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserDetails();
    setRefreshing(false);
  };

  const handleToggleStatus = async () => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';

    Alert.alert(
      `${newStatus === 'active' ? 'Activate' : 'Deactivate'} User`,
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: newStatus === 'active' ? 'Activate' : 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await axios.put(
                `${config.API_URL}/users/${id}`,
                { status: newStatus },
                headers
              );

              Alert.alert('Success', `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
              await loadUserDetails();
            } catch (error) {
              Alert.alert('Error', 'Failed to update user status');
            }
          },
        },
      ]
    );
  };

  const handleEditUser = () => {
    Alert.alert('Coming Soon', 'User editing will be available soon');
  };

  const handleDeleteUser = () => {
    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await axios.delete(`${config.API_URL}/users/${id}`, headers);

              Alert.alert('Success', 'User deleted successfully', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          User not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Details</Text>
        <TouchableOpacity onPress={handleEditUser} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              source={{ uri: user.profilePicture }}
              name={`${user.firstName} ${user.lastName}`}
              size={80}
            />
            <View style={styles.profileInfo}>
              <Text style={[styles.userName, { color: theme.colors.text }]}>
                {user.firstName} {user.lastName}
              </Text>
              <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
                {user.email}
              </Text>
              <View style={styles.badges}>
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        user.role === 'admin'
                          ? `${theme.colors.primary}20`
                          : `${theme.colors.success}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      {
                        color:
                          user.role === 'admin'
                            ? theme.colors.primary
                            : theme.colors.success,
                      },
                    ]}
                  >
                    {user.role}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        user.status === 'active'
                          ? `${theme.colors.success}20`
                          : `${theme.colors.error}20`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          user.status === 'active'
                            ? theme.colors.success
                            : theme.colors.error,
                      },
                    ]}
                  >
                    {user.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="card" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Employee ID
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {user.employeeId}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="briefcase" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Department
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {user.department || 'N/A'}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="call" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Phone
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {user.phoneNumber || 'N/A'}
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Ionicons name="calendar" size={18} color={theme.colors.textSecondary} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Joined
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {format(new Date(user.createdAt), 'MMM yyyy')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Stats Card */}
        {stats && (
          <Card style={styles.statsCard}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              This Month's Stats
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.success }]}>
                  {stats.presentDays}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Present
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.warning }]}>
                  {stats.lateDays}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Late
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.error }]}>
                  {stats.absentDays}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Absent
                </Text>
              </View>

              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {stats.attendanceRate}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Rate
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Recent Attendance */}
        <Card style={styles.attendanceCard}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recent Attendance
          </Text>

          {attendance.length > 0 ? (
            attendance.slice(0, 10).map((record) => (
              <View
                key={record._id}
                style={[
                  styles.attendanceRecord,
                  { borderBottomColor: theme.colors.border },
                ]}
              >
                <View style={styles.attendanceLeft}>
                  <Text style={[styles.attendanceDate, { color: theme.colors.text }]}>
                    {format(new Date(record.date), 'MMM dd, yyyy')}
                  </Text>
                  <View style={styles.attendanceTimes}>
                    <Text
                      style={[styles.attendanceTime, { color: theme.colors.textSecondary }]}
                    >
                      {record.checkIn?.time
                        ? format(new Date(record.checkIn.time), 'HH:mm')
                        : '--:--'}{' '}
                      - {' '}
                      {record.checkOut?.time
                        ? format(new Date(record.checkOut.time), 'HH:mm')
                        : '--:--'}
                    </Text>
                  </View>
                </View>
                <StatusBadge status={record.status} size="small" />
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No attendance records
            </Text>
          )}
        </Card>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  user.status === 'active'
                    ? `${theme.colors.warning}20`
                    : `${theme.colors.success}20`,
                borderColor:
                  user.status === 'active' ? theme.colors.warning : theme.colors.success,
              },
            ]}
            onPress={handleToggleStatus}
          >
            <Ionicons
              name={user.status === 'active' ? 'pause' : 'play'}
              size={20}
              color={user.status === 'active' ? theme.colors.warning : theme.colors.success}
            />
            <Text
              style={[
                styles.actionButtonText,
                {
                  color:
                    user.status === 'active' ? theme.colors.warning : theme.colors.success,
                },
              ]}
            >
              {user.status === 'active' ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: `${theme.colors.error}20`,
                borderColor: theme.colors.error,
              },
            ]}
            onPress={handleDeleteUser}
          >
            <Ionicons name="trash" size={20} color={theme.colors.error} />
            <Text style={[styles.actionButtonText, { color: theme.colors.error }]}>
              Delete User
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    padding: 16,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    width: (width - 64) / 2,
    alignItems: 'flex-start',
  },
  infoLabel: {
    fontSize: 11,
    marginTop: 4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  attendanceCard: {
    padding: 16,
    marginBottom: 16,
  },
  attendanceRecord: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  attendanceLeft: {
    flex: 1,
  },
  attendanceDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  attendanceTimes: {
    flexDirection: 'row',
  },
  attendanceTime: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
});
