import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuth } from '../../src/hooks/useAuth';
import { Card } from '../../src/components/common/Card';
import { Avatar } from '../../src/components/common/Avatar';
import { Loading } from '../../src/components/common/Loading';
import { StatusBadge } from '../../src/components/attendance/StatusBadge';
import axios from 'axios';
import { config } from '../../src/constants/config';
import { secureStorage } from '../../src/utils/storage';
import { APP_CONFIG } from '../../src/constants/config';

export default function AdminScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard Data
  const [dashboardStats, setDashboardStats] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState([]);
  
  // Users Data
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Attendance Data
  const [allAttendance, setAllAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (user?.role !== 'admin') {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      router.back();
      return;
    }
    
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        await loadDashboardData();
      } else if (activeTab === 'users') {
        await loadUsers();
      } else if (activeTab === 'attendance') {
        await loadAttendance();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getAuthHeaders = async () => {
    const token = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  const loadDashboardData = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Load dashboard stats
      const statsResponse = await axios.get(
        `${config.API_URL}/dashboard/admin`,
        headers
      );
      
      if (statsResponse.data.success) {
        setDashboardStats(statsResponse.data.data);
      }
      
      // Load today's attendance
      const today = new Date();
      const attendanceResponse = await axios.get(
        `${config.API_URL}/attendance/history`,
        {
          ...headers,
          params: {
            date: today.toISOString(),
          },
        }
      );
      
      if (attendanceResponse.data.success) {
        setTodayAttendance(attendanceResponse.data.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${config.API_URL}/users`, headers);
      
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${config.API_URL}/attendance/history`,
        {
          ...headers,
          params: {
            date: selectedDate.toISOString(),
          },
        }
      );
      
      if (response.data.success) {
        setAllAttendance(response.data.data);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const filteredUsers = users.filter(u =>
    u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.employeeId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderDashboard = () => (
    <ScrollView
      style={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Dashboard Overview
      </Text>
      
      {dashboardStats && (
        <>
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                <Ionicons name="people" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {dashboardStats.totalUsers || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Total Employees
              </Text>
            </Card>

            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${theme.colors.success}20` }]}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {dashboardStats.presentToday || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Present Today
              </Text>
            </Card>

            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${theme.colors.error}20` }]}>
                <Ionicons name="close-circle" size={24} color={theme.colors.error} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {dashboardStats.absentToday || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Absent Today
              </Text>
            </Card>

            <Card style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${theme.colors.warning}20` }]}>
                <Ionicons name="time" size={24} color={theme.colors.warning} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                {dashboardStats.lateToday || 0}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Late Today
              </Text>
            </Card>
          </View>

          {/* Today's Attendance List */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>
            Today's Attendance
          </Text>
          
          {todayAttendance.map((attendance) => (
            <Card key={attendance._id} style={styles.attendanceCard}>
              <View style={styles.attendanceRow}>
                <Avatar
                  source={{ uri: attendance.user?.profilePicture }}
                  name={`${attendance.user?.firstName} ${attendance.user?.lastName}`}
                  size={48}
                />
                <View style={styles.attendanceInfo}>
                  <Text style={[styles.attendanceName, { color: theme.colors.text }]}>
                    {attendance.user?.firstName} {attendance.user?.lastName}
                  </Text>
                  <Text style={[styles.attendanceDetail, { color: theme.colors.textSecondary }]}>
                    {attendance.user?.employeeId} • {attendance.user?.department}
                  </Text>
                  <View style={styles.attendanceTimes}>
                    <View style={styles.timeItem}>
                      <Ionicons name="log-in" size={14} color={theme.colors.success} />
                      <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                        {attendance.checkIn?.time
                          ? format(new Date(attendance.checkIn.time), 'HH:mm')
                          : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.timeItem}>
                      <Ionicons name="log-out" size={14} color={theme.colors.error} />
                      <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                        {attendance.checkOut?.time
                          ? format(new Date(attendance.checkOut.time), 'HH:mm')
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
                <StatusBadge status={attendance.status} />
              </View>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );

  const renderUsers = () => (
    <View style={styles.content}>
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card }]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search employees..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Card style={styles.userCard}>
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => router.push(`/admin/user-details/${item._id}`)}
            >
              <Avatar
                source={{ uri: item.profilePicture }}
                name={`${item.firstName} ${item.lastName}`}
                size={56}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.colors.text }]}>
                  {item.firstName} {item.lastName}
                </Text>
                <Text style={[styles.userDetail, { color: theme.colors.textSecondary }]}>
                  {item.employeeId}
                </Text>
                <Text style={[styles.userDetail, { color: theme.colors.textSecondary }]}>
                  {item.email}
                </Text>
                <View style={styles.userMeta}>
                  <View style={[styles.roleBadge, { backgroundColor: item.role === 'admin' ? `${theme.colors.primary}20` : `${theme.colors.success}20` }]}>
                    <Text style={[styles.roleText, { color: item.role === 'admin' ? theme.colors.primary : theme.colors.success }]}>
                      {item.role}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? `${theme.colors.success}20` : `${theme.colors.error}20` }]}>
                    <Text style={[styles.statusText, { color: item.status === 'active' ? theme.colors.success : theme.colors.error }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No employees found
          </Text>
        }
      />
    </View>
  );

  const renderAttendance = () => (
    <View style={styles.content}>
      <View style={[styles.dateSelector, { backgroundColor: theme.colors.card }]}>
        <TouchableOpacity
          onPress={() => {
            const newDate = new Date(selectedDate);
            newDate.setDate(newDate.getDate() - 1);
            setSelectedDate(newDate);
            loadAttendance();
          }}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.dateText, { color: theme.colors.text }]}>
          {format(selectedDate, 'MMM dd, yyyy')}
        </Text>
        <TouchableOpacity
          onPress={() => {
            const today = new Date();
            if (selectedDate < today) {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 1);
              setSelectedDate(newDate);
              loadAttendance();
            }
          }}
          disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? theme.colors.border : theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={allAttendance}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <Card style={styles.attendanceCard}>
            <View style={styles.attendanceRow}>
              <Avatar
                source={{ uri: item.user?.profilePicture }}
                name={`${item.user?.firstName} ${item.user?.lastName}`}
                size={48}
              />
              <View style={styles.attendanceInfo}>
                <Text style={[styles.attendanceName, { color: theme.colors.text }]}>
                  {item.user?.firstName} {item.user?.lastName}
                </Text>
                <Text style={[styles.attendanceDetail, { color: theme.colors.textSecondary }]}>
                  {item.user?.employeeId}
                </Text>
                <View style={styles.attendanceTimes}>
                  <View style={styles.timeItem}>
                    <Ionicons name="log-in" size={14} color={theme.colors.success} />
                    <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                      {item.checkIn?.time ? format(new Date(item.checkIn.time), 'HH:mm') : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.timeItem}>
                    <Ionicons name="log-out" size={14} color={theme.colors.error} />
                    <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                      {item.checkOut?.time ? format(new Date(item.checkOut.time), 'HH:mm') : 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>
              <StatusBadge status={item.status} />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No attendance records for this date
          </Text>
        }
      />
    </View>
  );

  if (loading && !refreshing) {
    return <Loading />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.headerTitle}>Admin Panel</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'dashboard' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons
            name="stats-chart"
            size={20}
            color={activeTab === 'dashboard' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'dashboard' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'users' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'users' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'users' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Employees
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'attendance' && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => setActiveTab('attendance')}
        >
          <Ionicons
            name="calendar"
            size={20}
            color={activeTab === 'attendance' ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'attendance' ? theme.colors.primary : theme.colors.textSecondary },
            ]}
          >
            Attendance
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'attendance' && renderAttendance()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
  },
  userCard: {
    marginBottom: 12,
    padding: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  attendanceCard: {
    marginBottom: 12,
    padding: 12,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendanceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  attendanceName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  attendanceDetail: {
    fontSize: 12,
    marginBottom: 4,
  },
  attendanceTimes: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
  },
});
