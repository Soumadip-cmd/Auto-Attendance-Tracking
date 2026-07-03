import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, subDays } from 'date-fns';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { liveTrackingAPI } from '../../src/services/api';
import { Card } from '../../src/components/common/Card';

const RANGES = [
  { key: 'today', label: 'Today', days: 0 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
];

const getUserId = (user) => user?._id || user?.id;

const distanceMeters = (a, b) => {
  if (!a || !b) return 0;
  const toRad = (value) => (value * Math.PI) / 180;
  const radius = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const formatTime = (value) => {
  if (!value) return 'N/A';
  try {
    return format(new Date(value), 'dd MMM, hh:mm a');
  } catch {
    return 'N/A';
  }
};

export default function MovementScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState('today');
  const [trail, setTrail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const selectedRange = RANGES.find((item) => item.key === range) || RANGES[0];

  const loadTrail = useCallback(async (silent = false) => {
    const teacherId = getUserId(user);
    if (!teacherId) return;

    try {
      if (!silent) setLoading(true);
      setError(null);

      const now = new Date();
      const start = selectedRange.days === 0
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : subDays(now, selectedRange.days);

      const response = await liveTrackingAPI.getTeacherTrail(teacherId, {
        startTime: start.toISOString(),
        endTime: now.toISOString(),
        limit: 700,
      });
      setTrail(response?.data || null);
    } catch (err) {
      setError(err?.message || 'Could not load movement history.');
      setTrail(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRange.days, user]);

  useFocusEffect(
    useCallback(() => {
      loadTrail();
    }, [loadTrail])
  );

  const points = trail?.points || [];
  const metrics = useMemo(() => {
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      total += distanceMeters(points[i - 1], points[i]);
    }
    const violations = points.filter((point) => point.violation).length;
    const temporary = points.filter((point) => point.insideTemporaryPermission).length;
    const last = points[points.length - 1];
    return {
      totalKm: total / 1000,
      violations,
      temporary,
      last,
    };
  }, [points]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTrail(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 },
        ]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Movement</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Your recorded live tracking trail
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => loadTrail()}
            style={[styles.iconButton, { backgroundColor: theme.colors.card }]}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.segment}>
          {RANGES.map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setRange(item.key)}
              style={[
                styles.segmentButton,
                {
                  backgroundColor: range === item.key ? theme.colors.primary : theme.colors.card,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: range === item.key ? '#fff' : theme.colors.text },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
              Loading movement...
            </Text>
          </View>
        ) : error ? (
          <Card style={styles.stateCard}>
            <Ionicons name="alert-circle-outline" size={28} color={theme.colors.error} />
            <Text style={[styles.stateTitle, { color: theme.colors.text }]}>Movement unavailable</Text>
            <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>{error}</Text>
          </Card>
        ) : (
          <>
            <View style={styles.statsGrid}>
              <MetricCard label="Trail points" value={points.length} icon="git-branch" color="#6366f1" />
              <MetricCard label="Distance" value={`${metrics.totalKm.toFixed(2)} km`} icon="navigate" color="#0ea5e9" />
              <MetricCard label="Violations" value={metrics.violations} icon="warning" color="#ef4444" />
              <MetricCard label="Permit points" value={metrics.temporary} icon="shield-checkmark" color="#10b981" />
            </View>

            <Card style={styles.lastCard}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Last recorded location</Text>
                  <Text style={[styles.cardSubtext, { color: theme.colors.textSecondary }]}>
                    {formatTime(metrics.last?.timestamp)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: metrics.last?.violation ? '#fee2e2' : '#dcfce7' }]}>
                  <Text style={[styles.statusText, { color: metrics.last?.violation ? '#dc2626' : '#16a34a' }]}>
                    {metrics.last?.violation ? 'Outside' : 'OK'}
                  </Text>
                </View>
              </View>
              <View style={styles.locationLine}>
                <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.locationText, { color: theme.colors.text }]}>
                  {metrics.last
                    ? `${metrics.last.latitude.toFixed(6)}, ${metrics.last.longitude.toFixed(6)}`
                    : 'No location recorded yet'}
                </Text>
              </View>
            </Card>

            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent movement</Text>
            {points.length === 0 ? (
              <Card style={styles.stateCard}>
                <Ionicons name="walk-outline" size={28} color={theme.colors.textSecondary} />
                <Text style={[styles.stateTitle, { color: theme.colors.text }]}>No movement data</Text>
                <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
                  Start live tracking from the map screen to record your trail.
                </Text>
              </Card>
            ) : (
              points.slice(-20).reverse().map((point) => (
                <View
                  key={point.id || point.timestamp}
                  style={[styles.timelineItem, { backgroundColor: theme.colors.card }]}
                >
                  <View style={[styles.timelineDot, { backgroundColor: point.violation ? '#ef4444' : '#10b981' }]} />
                  <View style={styles.timelineBody}>
                    <Text style={[styles.timelineTitle, { color: theme.colors.text }]}>
                      {point.violation ? 'Outside geofence' : point.insideTemporaryPermission ? 'Inside permit radius' : 'Live update'}
                    </Text>
                    <Text style={[styles.cardSubtext, { color: theme.colors.textSecondary }]}>
                      {formatTime(point.timestamp)} | GPS {Math.round(point.accuracy || 0)}m
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MetricCard({ label, value, icon, color }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.metricCard, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 3 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: { fontSize: 13, fontWeight: '700' },
  centerState: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  stateCard: { alignItems: 'center', gap: 8, marginTop: 8 },
  stateTitle: { fontSize: 16, fontWeight: '800' },
  stateText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    width: '48.5%',
    borderRadius: 12,
    padding: 14,
    minHeight: 118,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 12, marginTop: 4 },
  lastCard: { marginBottom: 18 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSubtext: { fontSize: 12, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '800' },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  locationText: { fontSize: 13, flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10 },
  timelineItem: {
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  timelineBody: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '800' },
});
