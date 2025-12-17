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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useAttendance } from '../../src/hooks/useAttendance';
import { useTheme } from '../../src/hooks/useTheme';
import { AttendanceCard } from '../../src/components/attendance/AttendanceCard';
import { Loading } from '../../src/components/common/Loading';

export default function AttendanceScreen() {
  const router = useRouter();
  const { attendanceHistory, getHistory, isLoading } = useAttendance();
  const { theme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    fetchAttendance();
  }, [selectedMonth]);

  const fetchAttendance = async () => {
    const startDate = startOfMonth(selectedMonth);
    const endDate = endOfMonth(selectedMonth);

    await getHistory({
      startDate:  startDate.toISOString(),
      endDate: endDate. toISOString(),
      sortBy: 'date',
      sortOrder: 'desc',
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendance();
    setRefreshing(false);
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (selectedMonth < now) {
      setSelectedMonth(new Date(selectedMonth.setMonth(selectedMonth. getMonth() + 1)));
    }
  };

  const handleAttendancePress = (attendance) => {
    router.push(`/attendance/details/${attendance._id}`);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      selectedMonth.getMonth() === now.getMonth() &&
      selectedMonth.getFullYear() === now.getFullYear()
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.screenHeader}>
        <Text style={[styles.screenTitle, { color: theme.colors.text }]}>
          📅 Attendance History
        </Text>
      </View>

      <View style={styles.header}>
        <View style={[styles.monthSelector, { backgroundColor: theme.colors. card }]}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

        <Text style={[styles. monthText, { color: theme. colors.text }]}>
          {format(selectedMonth, 'MMMM yyyy')}
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={styles.monthButton}
          disabled={isCurrentMonth()}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={isCurrentMonth() ? theme.colors.border : theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      {attendanceHistory. length > 0 && (
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors. success }]}>
              {attendanceHistory.filter((a) => a.status === 'present').length}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Present
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={[styles. summaryValue, { color: theme.colors.warning }]}>
              {attendanceHistory.filter((a) => a.status === 'late').length}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Late
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme. colors.error }]}>
              {attendanceHistory.filter((a) => a.status === 'absent').length}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Absent
            </Text>
          </View>

          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.colors.info }]}>
              {attendanceHistory.filter((a) => a.status === 'half-day').length}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              Half Day
            </Text>
          </View>
        </View>
      )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={80} color={theme.colors.border} />
      <Text style={[styles.emptyTitle, { color: theme.colors. text }]}>
        No Attendance Records
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme. colors.textSecondary }]}>
        No attendance data found for this month
      </Text>
    </View>
  );

  if (isLoading && !refreshing) {
    return <Loading message="Loading attendance..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={attendanceHistory}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <AttendanceCard attendance={item} onPress={() => handleAttendancePress(item)} />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[styles.listContent, { paddingBottom: 90 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 60,
  },
  screenHeader: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  monthButton: {
    padding: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  summary:  {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  summaryItem:  {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize:  24,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle:  {
    fontSize: 14,
    textAlign: 'center',
  },
});