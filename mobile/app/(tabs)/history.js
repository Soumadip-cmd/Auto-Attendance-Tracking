import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useTheme } from '../../src/hooks/useTheme';
import { useAttendance } from '../../src/hooks/useAttendance';
import { Card } from '../../src/components/common/Card';
import { Loading } from '../../src/components/common/Loading';
import MovementHistory from '../../src/components/MovementHistory';
import { movementPermissionAPI } from '../../src/services/api';

// ── Permission History component ──────────────────────────────────────────────
function PermissionHistory({ theme }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true); else setLoading(true);
    try {
      const res = await movementPermissionAPI.getAll();
      if (res?.success) setPermissions(res.data || []);
    } catch (e) {
      console.warn('Failed to load permissions:', e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusConfig = {
    approved:  { color: '#10b981', bg: '#d1fae5', icon: 'checkmark-circle' },
    pending:   { color: '#f59e0b', bg: '#fef3c7', icon: 'time' },
    rejected:  { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle' },
    expired:   { color: '#9ca3af', bg: '#f3f4f6', icon: 'timer-outline' },
    cancelled: { color: '#9ca3af', bg: '#f3f4f6', icon: 'ban' },
  };

  const fmtDT = (v) => {
    if (!v) return '--';
    return format(new Date(v), 'MMM d, h:mm a');
  };

  const renderItem = ({ item }) => {
    const cfg = statusConfig[item.status] || statusConfig.pending;
    const coords = item.allowedLocation?.coordinates;
    const lat = coords?.[1]?.toFixed(4);
    const lng = coords?.[0]?.toFixed(4);

    return (
      <Card style={[styles.permCard, { borderLeftColor: cfg.color, borderLeftWidth: 4 }]}>
        {/* Status badge */}
        <View style={styles.permHeader}>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={14} color={cfg.color} />
            <Text style={[styles.statusText, { color: cfg.color }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          <Text style={[styles.permDate, { color: theme.colors.textSecondary }]}>
            {fmtDT(item.createdAt)}
          </Text>
        </View>

        {/* Reason */}
        <Text style={[styles.permReason, { color: theme.colors.text }]} numberOfLines={2}>
          {item.reason}
        </Text>

        {/* Time window */}
        <View style={styles.permRow}>
          <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={[styles.permDetail, { color: theme.colors.textSecondary }]}>
            {fmtDT(item.startTime)} → {fmtDT(item.endTime)}
          </Text>
        </View>

        {/* Location + radius */}
        {lat && (
          <View style={styles.permRow}>
            <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.permDetail, { color: theme.colors.textSecondary }]}>
              {lat}, {lng}  ·  {item.radius}m radius
            </Text>
          </View>
        )}

        {/* Decision notes */}
        {item.decisionNotes ? (
          <View style={[styles.notesBg, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.notesText, { color: theme.colors.textSecondary }]}>
              💬 {item.decisionNotes}
            </Text>
          </View>
        ) : null}

        {/* Approved by */}
        {item.approvedBy && (
          <Text style={[styles.approvedBy, { color: theme.colors.textSecondary }]}>
            Granted by {item.approvedBy.firstName} {item.approvedBy.lastName}
          </Text>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={permissions}
      renderItem={renderItem}
      keyExtractor={(p) => p._id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Ionicons name="shield-checkmark-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No movement permissions yet
          </Text>
        </View>
      }
    />
  );
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { getHistory, attendanceHistory, isLoading } = useAttendance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'movement' | 'permissions'

  useEffect(() => {
    loadHistory();
  }, [selectedMonth]);

  const loadHistory = async () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    
    await getHistory({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const formatTime = (timeString) => {
    if (!timeString) return '--:--';
    try {
      return format(new Date(timeString), 'h:mm a');
    } catch (error) {
      return '--:--';
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const formatDayName = (dateString) => {
    try {
      return format(new Date(dateString), 'EEEE');
    } catch (error) {
      return '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return theme.colors.success;
      case 'late':
        return theme.colors.warning;
      case 'absent':
        return theme.colors.error;
      case 'checked-in':
        return theme.colors.primary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return 'checkmark-circle';
      case 'late':
        return 'time';
      case 'absent':
        return 'close-circle';
      case 'checked-in':
        return 'log-in';
      default:
        return 'help-circle';
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ');
  };

  const calculateWorkHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '--';
    try {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const diff = (end - start) / (1000 * 60 * 60); // Hours
      return `${diff.toFixed(1)}h`;
    } catch (error) {
      return '--';
    }
  };

  const formatLateTime = (minutes) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  const renderHistoryItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    
    return (
      <Card style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateSection}>
            <Text style={[styles.dayName, { color: theme.colors.textSecondary }]}>
              {formatDayName(item.date)}
            </Text>
            <Text style={[styles.date, { color: theme.colors.text }]}>
              {formatDate(item.date)}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Ionicons name={statusIcon} size={16} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Ionicons name="log-in-outline" size={18} color={theme.colors.success} />
              <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>
                Check In
              </Text>
              <Text style={[styles.timeValue, { color: theme.colors.text }]}>
                {formatTime(item.checkIn?.time)}
              </Text>
            </View>

            <View style={styles.timeDivider} />

            <View style={styles.timeItem}>
              <Ionicons name="log-out-outline" size={18} color={theme.colors.error} />
              <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>
                Check Out
              </Text>
              <Text style={[styles.timeValue, { color: theme.colors.text }]}>
                {formatTime(item.checkOut?.time)}
              </Text>
            </View>

            <View style={styles.timeDivider} />

            <View style={styles.timeItem}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>
                Hours
              </Text>
              <Text style={[styles.timeValue, { color: theme.colors.text }]}>
                {calculateWorkHours(item.checkIn?.time, item.checkOut?.time)}
              </Text>
            </View>
          </View>

          {item.isLate && (
            <View style={[styles.warningBadge, { backgroundColor: theme.colors.warning + '10' }]}>
              <Ionicons name="alert-circle" size={14} color={theme.colors.warning} />
              <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                Late by {formatLateTime(item.lateBy)}
              </Text>
            </View>
          )}

          {item.isEarlyDeparture && (
            <View style={[styles.warningBadge, { backgroundColor: theme.colors.error + '10' }]}>
              <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
              <Text style={[styles.warningText, { color: theme.colors.error }]}>
                Early by {formatLateTime(item.earlyBy)}
              </Text>
            </View>
          )}

          {item.checkIn?.notes && (
            <View style={styles.notesSection}>
              <Text style={[styles.notesLabel, { color: theme.colors.textSecondary }]}>
                Notes:
              </Text>
              <Text style={[styles.notesText, { color: theme.colors.text }]}>
                {item.checkIn.notes}
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const changeMonth = (direction) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setSelectedMonth(newMonth);
  };

  if (isLoading && attendanceHistory.length === 0) {
    return <Loading />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          History
        </Text>
        
        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'attendance' && styles.activeTab,
              activeTab === 'attendance' && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setActiveTab('attendance')}
          >
            <Ionicons 
              name="calendar" 
              size={18} 
              color={activeTab === 'attendance' ? '#fff' : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'attendance' && styles.activeTabText,
              { color: activeTab === 'attendance' ? '#fff' : theme.colors.textSecondary }
            ]}>
              Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'movement' && styles.activeTab,
              activeTab === 'movement' && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setActiveTab('movement')}
          >
            <Ionicons
              name="footsteps"
              size={18}
              color={activeTab === 'movement' ? '#fff' : theme.colors.textSecondary}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'movement' && styles.activeTabText,
              { color: activeTab === 'movement' ? '#fff' : theme.colors.textSecondary }
            ]}>
              Movement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'permissions' && styles.activeTab,
              activeTab === 'permissions' && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setActiveTab('permissions')}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={activeTab === 'permissions' ? '#fff' : theme.colors.textSecondary}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'permissions' && styles.activeTabText,
              { color: activeTab === 'permissions' ? '#fff' : theme.colors.textSecondary }
            ]}>
              Permits
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Month Selector – only for Attendance tab */}
        {activeTab === 'attendance' && (
          <View style={styles.monthSelector}>
            <TouchableOpacity
              style={[styles.monthButton, { backgroundColor: theme.colors.primary + '10' }]}
              onPress={() => changeMonth(-1)}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          
          <Text style={[styles.monthText, { color: theme.colors.text }]}>
            {format(selectedMonth, 'MMMM yyyy')}
          </Text>
          
          <TouchableOpacity
            style={[styles.monthButton, { backgroundColor: theme.colors.primary + '10' }]}
            onPress={() => changeMonth(1)}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        )}
      </View>

      {/* Content */}
      {activeTab === 'attendance' && (
        <FlatList
          data={attendanceHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No attendance records for this month
              </Text>
            </View>
          }
        />
      )}
      {activeTab === 'movement' && <MovementHistory />}
      {activeTab === 'permissions' && <PermissionHistory theme={theme} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  historyCard: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateSection: {
    flex: 1,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  date: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  timeDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '500',
  },
  notesSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  // ── PermissionHistory styles ──────────────────────────────────────────────────
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  permCard: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
  },
  permHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  permDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  permReason: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  permDetail: {
    fontSize: 12,
    flex: 1,
  },
  notesBg: {
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  approvedBy: {
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
