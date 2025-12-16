import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { useTheme } from '../../hooks/useTheme';
import { format } from 'date-fns';

export const AttendanceCard = ({ attendance, onPress }) => {
  const { theme } = useTheme();

  const getStatusColor = (status) => {
    switch (status) {
      case 'present':
        return theme.colors.success;
      case 'absent':
        return theme.colors.error;
      case 'late':
        return theme.colors.warning;
      case 'half-day':
        return theme. colors.info;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return 'checkmark-circle';
      case 'absent': 
        return 'close-circle';
      case 'late': 
        return 'time';
      case 'half-day':
        return 'calendar';
      default:
        return 'help-circle';
    }
  };

  const formatTime = (time) => {
    if (!time) return '--:--';
    return format(new Date(time), 'hh:mm a');
  };

  const calculateDuration = () => {
    if (!attendance. checkIn) return '--';
    if (!attendance.checkOut) return 'In Progress';
    
    const checkIn = new Date(attendance.checkIn. timestamp);
    const checkOut = new Date(attendance.checkOut.timestamp);
    const duration = (checkOut - checkIn) / (1000 * 60 * 60); // hours
    
    const hours = Math.floor(duration);
    const minutes = Math.round((duration - hours) * 60);
    
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Text style={[styles.date, { color: theme.colors.text }]}>
            {format(new Date(attendance.date), 'MMM dd, yyyy')}
          </Text>
          <Text style={[styles.day, { color: theme.colors. textSecondary }]}>
            {format(new Date(attendance. date), 'EEEE')}
          </Text>
        </View>

        <View
          style={[
            styles. statusBadge,
            {
              backgroundColor: `${getStatusColor(attendance.status)}20`,
              borderColor: getStatusColor(attendance. status),
            },
          ]}
        >
          <Ionicons
            name={getStatusIcon(attendance. status)}
            size={16}
            color={getStatusColor(attendance.status)}
          />
          <Text
            style={[
              styles. statusText,
              {
                color: getStatusColor(attendance. status),
                marginLeft: theme.spacing.xs,
              },
            ]}
          >
            {attendance.status. charAt(0).toUpperCase() + attendance.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.timeContainer}>
        <View style={styles.timeItem}>
          <View style={styles.timeIconContainer}>
            <Ionicons name="log-in" size={20} color={theme.colors.success} />
          </View>
          <View>
            <Text style={[styles.timeLabel, { color: theme.colors. textSecondary }]}>
              Check In
            </Text>
            <Text style={[styles. timeValue, { color: theme. colors.text }]}>
              {formatTime(attendance.checkIn?. timestamp)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.timeItem}>
          <View style={styles.timeIconContainer}>
            <Ionicons name="log-out" size={20} color={theme.colors. error} />
          </View>
          <View>
            <Text style={[styles.timeLabel, { color: theme.colors. textSecondary }]}>
              Check Out
            </Text>
            <Text style={[styles.timeValue, { color: theme.colors.text }]}>
              {formatTime(attendance.checkOut?.timestamp)}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.footerText, { color: theme.colors. textSecondary }]}>
            Duration: {calculateDuration()}
          </Text>
        </View>

        {attendance.workingHours && (
          <View style={styles.footerItem}>
            <Ionicons name="briefcase-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
              {attendance.workingHours. toFixed(1)}h
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header:  {
    flexDirection: 'row',
    justifyContent:  'space-between',
    alignItems: 'flex-start',
    marginBottom:  16,
  },
  dateContainer: {},
  date: {
    fontSize: 16,
    fontWeight: '600',
  },
  day: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical:  6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems:  'center',
    flex: 1,
  },
  timeIconContainer: {
    marginRight: 12,
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
  },
});