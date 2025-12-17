import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useAttendance } from '../../src/hooks/useAttendance';
import { useTheme } from '../../src/hooks/useTheme';
import { Card } from '../../src/components/common/Card';
import { StatsCard } from '../../src/components/attendance/StatsCard';
import { Loading } from '../../src/components/common/Loading';

const { width } = Dimensions. get('window');

export default function ReportsScreen() {
  const { stats, getStats, isLoading } = useAttendance();
  const { theme } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    fetchStats();
  }, [selectedPeriod]);

  const fetchStats = async () => {
    await getStats({ period: selectedPeriod });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const periods = [
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'year', label: 'This Year' },
  ];

  const PeriodSelector = () => (
    <View style={styles.periodSelector}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period.key}
          style={[
            styles.periodButton,
            {
              backgroundColor: 
                selectedPeriod === period.key
                  ? theme. colors.primary
                  : theme.colors.card,
            },
          ]}
          onPress={() => setSelectedPeriod(period.key)}
        >
          <Text
            style={[
              styles.periodButtonText,
              {
                color: 
                  selectedPeriod === period.key
                    ? '#ffffff'
                    : theme. colors.text,
              },
            ]}
          >
            {period. label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading && !refreshing) {
    return <Loading message="Loading reports..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.screenHeader}>
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>
            📊 Reports & Analytics
          </Text>
        </View>

        <PeriodSelector />

        {/* Overview Stats */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors. text }]}>
            Overview
          </Text>

          <View style={styles.statsGrid}>
            <StatsCard
              icon="checkmark-done-circle"
              label="Present Days"
              value={stats?. presentDays || 0}
              color={theme.colors.success}
              subtitle={`${stats?.attendanceRate || 0}%`}
            />

            <StatsCard
              icon="time"
              label="Late Days"
              value={stats?. lateDays || 0}
              color={theme.colors.warning}
            />

            <StatsCard
              icon="close-circle"
              label="Absent Days"
              value={stats?. absentDays || 0}
              color={theme.colors. error}
            />

            <StatsCard
              icon="calendar"
              label="Half Days"
              value={stats?.halfDays || 0}
              color={theme.colors.info}
            />
          </View>
        </View>

        {/* Working Hours */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors. text }]}>
            Working Hours
          </Text>

          <Card>
            <View style={styles. workingHoursRow}>
              <View style={styles.workingHoursItem}>
                <Text style={[styles.workingHoursLabel, { color: theme. colors.textSecondary }]}>
                  Total Hours
                </Text>
                <Text style={[styles.workingHoursValue, { color:  theme.colors.text }]}>
                  {stats?.totalHours || 0}h
                </Text>
              </View>

              <View style={styles.workingHoursDivider} />

              <View style={styles.workingHoursItem}>
                <Text style={[styles.workingHoursLabel, { color: theme.colors.textSecondary }]}>
                  Average/Day
                </Text>
                <Text style={[styles.workingHoursValue, { color:  theme.colors.text }]}>
                  {stats?.averageHoursPerDay || 0}h
                </Text>
              </View>

              <View style={styles.workingHoursDivider} />

              <View style={styles.workingHoursItem}>
                <Text style={[styles.workingHoursLabel, { color: theme.colors.textSecondary }]}>
                  Required
                </Text>
                <Text style={[styles.workingHoursValue, { color: theme.colors.text }]}>
                  {stats?.requiredHours || 0}h
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Attendance Rate */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors. text }]}>
            Attendance Rate
          </Text>

          <Card>
            <View style={styles.rateContainer}>
              <View style={styles.rateCircle}>
                <Text style={[styles.rateValue, { color: theme.colors. primary }]}>
                  {stats?.attendanceRate || 0}%
                </Text>
              </View>
              <View style={styles.rateInfo}>
                <Text style={[styles.rateText, { color: theme.colors. text }]}>
                  Your attendance rate is{' '}
                  <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                    {stats?.attendanceRate >= 90 ? 'Excellent' : stats?.attendanceRate >= 75 ? 'Good' : 'Needs Improvement'}
                  </Text>
                </Text>
                <Text style={[styles.rateSubtext, { color: theme.colors.textSecondary }]}>
                  {stats?. presentDays || 0} present days out of {stats?.totalWorkingDays || 0} working days
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Punctuality */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Punctuality
          </Text>

          <Card>
            <View style={styles.punctualityRow}>
              <View style={styles.punctualityItem}>
                <Ionicons name="checkmark-circle" size={32} color={theme.colors.success} />
                <Text style={[styles.punctualityValue, { color: theme.colors. text }]}>
                  {stats?.onTimeDays || 0}
                </Text>
                <Text style={[styles.punctualityLabel, { color: theme.colors.textSecondary }]}>
                  On Time
                </Text>
              </View>

              <View style={styles.punctualityItem}>
                <Ionicons name="time" size={32} color={theme.colors.warning} />
                <Text style={[styles.punctualityValue, { color: theme.colors.text }]}>
                  {stats?.lateDays || 0}
                </Text>
                <Text style={[styles.punctualityLabel, { color: theme.colors. textSecondary }]}>
                  Late
                </Text>
              </View>

              <View style={styles.punctualityItem}>
                <Ionicons name="alert-circle" size={32} color={theme.colors.error} />
                <Text style={[styles. punctualityValue, { color:  theme.colors.text }]}>
                  {stats?.earlyCheckouts || 0}
                </Text>
                <Text style={[styles.punctualityLabel, { color: theme.colors.textSecondary }]}>
                  Early Out
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Export Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors. text }]}>
            Export Report
          </Text>

          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: theme.colors. card }]}
          >
            <Ionicons name="download-outline" size={24} color={theme.colors.primary} />
            <Text style={[styles.exportButtonText, { color: theme.colors.text }]}>
              Download PDF Report
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: theme.colors.card }]}
          >
            <Ionicons name="document-text-outline" size={24} color={theme.colors.secondary} />
            <Text style={[styles.exportButtonText, { color: theme.colors.text }]}>
              Download Excel Report
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet. create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection:  'row',
    gap: 12,
    marginBottom: 24,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle:  {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  workingHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  workingHoursItem: {
    alignItems:  'center',
    flex:  1,
  },
  workingHoursLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  workingHoursValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  workingHoursDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateCircle:  {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    borderColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  rateValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  rateInfo: {
    flex: 1,
  },
  rateText: {
    fontSize:  16,
    marginBottom: 8,
  },
  rateSubtext: {
    fontSize: 14,
  },
  punctualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  punctualityItem:  {
    alignItems: 'center',
  },
  punctualityValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  punctualityLabel:  {
    fontSize: 12,
  },
  exportButton:  {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
});