import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useTheme } from '../../src/hooks/useTheme';
import { useAttendance } from '../../src/hooks/useAttendance';
import { Card } from '../../src/components/common/Card';
import { Loading } from '../../src/components/common/Loading';
import MovementHistory from '../../src/components/MovementHistory';

export default function HistoryScreen() {
  const { theme } = useTheme();
  const { getHistory, attendanceHistory, isLoading } = useAttendance();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' or 'movement'

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
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
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
        </View>
        
        {/* Month Selector - Only for Attendance */}
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
      {activeTab === 'attendance' ? (
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
      ) : (
        <MovementHistory />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
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
});
