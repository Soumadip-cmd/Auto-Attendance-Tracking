import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useTheme } from '../../src/hooks/useTheme';
import { movementPermissionAPI } from '../../src/services/api';
import { Card } from '../../src/components/common/Card';

const STATUS = {
  pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7', icon: 'hourglass' },
  approved: { label: 'Approved', color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fee2e2', icon: 'close-circle' },
  cancelled: { label: 'Cancelled', color: '#64748b', bg: '#e2e8f0', icon: 'remove-circle' },
  expired: { label: 'Expired', color: '#64748b', bg: '#e2e8f0', icon: 'time' },
};

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  try {
    return format(new Date(value), 'dd MMM, hh:mm a');
  } catch {
    return 'N/A';
  }
};

const getStatusMeta = (permission) => {
  if (permission?.status === 'approved' && permission?.endTime && new Date(permission.endTime) < new Date()) {
    return STATUS.expired;
  }
  return STATUS[permission?.status] || STATUS.pending;
};

export default function PermitsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activePermission, setActivePermission] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState(null);

  const loadPermits = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [activeResponse, requestsResponse] = await Promise.all([
        movementPermissionAPI.getActivePermission(),
        movementPermissionAPI.getAll(),
      ]);
      setActivePermission(activeResponse?.data || null);
      setRequests(Array.isArray(requestsResponse?.data) ? requestsResponse.data : []);
    } catch (error) {
      Alert.alert('Permits unavailable', error?.message || 'Could not load movement permits.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPermits();
    }, [loadPermits])
  );

  const counts = useMemo(() => {
    return requests.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0, cancelled: 0 }
    );
  }, [requests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPermits(true);
  };

  const cancelPermit = (permit) => {
    Alert.alert(
      'Cancel permit',
      'Do you want to cancel this movement permission request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel permit',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionId(permit._id);
              await movementPermissionAPI.cancel(permit._id, {
                decisionNotes: 'Cancelled from mobile app',
              });
              await loadPermits(true);
            } catch (error) {
              Alert.alert('Cancel failed', error?.message || 'Could not cancel request.');
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
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
            <Text style={[styles.title, { color: theme.colors.text }]}>Permits</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Temporary movement access requests
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/movement-request')}
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
              Loading permits...
            </Text>
          </View>
        ) : (
          <>
            <ActivePermitCard permit={activePermission} />

            <View style={styles.statsRow}>
              <SmallStat label="Pending" value={counts.pending} color="#f59e0b" />
              <SmallStat label="Approved" value={counts.approved} color="#16a34a" />
              <SmallStat label="Rejected" value={counts.rejected} color="#dc2626" />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>All requests</Text>
              <TouchableOpacity onPress={() => router.push('/movement-request')}>
                <Text style={[styles.linkText, { color: theme.colors.primary }]}>New request</Text>
              </TouchableOpacity>
            </View>

            {requests.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="shield-outline" size={30} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No permits yet</Text>
                <Text style={[styles.stateText, { color: theme.colors.textSecondary }]}>
                  Request access when urgent work requires leaving the normal geofence.
                </Text>
              </Card>
            ) : (
              requests.map((permit) => (
                <PermitItem
                  key={permit._id}
                  permit={permit}
                  actionId={actionId}
                  onCancel={cancelPermit}
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ActivePermitCard({ permit }) {
  const { theme } = useTheme();
  const meta = getStatusMeta(permit);

  return (
    <Card style={[styles.activeCard, { borderLeftColor: permit ? meta.color : theme.colors.border }]}>
      <View style={styles.rowBetween}>
        <View style={styles.rowCenter}>
          <View style={[styles.bigIcon, { backgroundColor: permit ? meta.bg : theme.colors.background }]}>
            <Ionicons name={permit ? meta.icon : 'shield-outline'} size={22} color={permit ? meta.color : theme.colors.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
              {permit ? 'Active movement access' : 'No active permit'}
            </Text>
            <Text style={[styles.cardSubtext, { color: theme.colors.textSecondary }]}>
              {permit ? `${permit.radius}m radius until ${formatDateTime(permit.endTime)}` : 'You are limited to assigned geofence areas.'}
            </Text>
          </View>
        </View>
        {permit && <StatusBadge permit={permit} />}
      </View>
      {permit?.reason && (
        <Text style={[styles.reason, { color: theme.colors.text }]} numberOfLines={3}>
          {permit.reason}
        </Text>
      )}
    </Card>
  );
}

function StatusBadge({ permit }) {
  const meta = getStatusMeta(permit);
  return (
    <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
    </View>
  );
}

function SmallStat({ label, value, color }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function PermitItem({ permit, actionId, onCancel }) {
  const { theme } = useTheme();
  const meta = getStatusMeta(permit);
  const canCancel = permit.status === 'pending' || permit.status === 'approved';

  return (
    <View style={[styles.permitItem, { backgroundColor: theme.colors.card }]}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.permitTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {permit.reason || 'Movement permission'}
          </Text>
          <Text style={[styles.cardSubtext, { color: theme.colors.textSecondary }]}>
            {formatDateTime(permit.startTime)} - {formatDateTime(permit.endTime)}
          </Text>
        </View>
        <StatusBadge permit={permit} />
      </View>

      <View style={styles.permitMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="radio-button-on-outline" size={15} color={theme.colors.primary} />
          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>{permit.radius}m</Text>
        </View>
        {permit.approvedBy && (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {permit.approvedBy.firstName} {permit.approvedBy.lastName}
            </Text>
          </View>
        )}
      </View>

      {permit.decisionNotes ? (
        <Text style={[styles.decisionNotes, { color: theme.colors.textSecondary }]}>
          {permit.decisionNotes}
        </Text>
      ) : null}

      {canCancel && (
        <TouchableOpacity
          disabled={actionId === permit._id}
          onPress={() => onCancel(permit)}
          style={[styles.cancelButton, { borderColor: theme.colors.error }]}
        >
          <Text style={[styles.cancelText, { color: theme.colors.error }]}>
            {actionId === permit._id ? 'Cancelling...' : 'Cancel request'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 3 },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerState: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  stateText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  activeCard: {
    borderLeftWidth: 4,
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSubtext: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  reason: { fontSize: 13, marginTop: 14, lineHeight: 18 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 12, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 12, marginTop: 3 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  linkText: { fontSize: 13, fontWeight: '800' },
  emptyCard: { alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800' },
  permitItem: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  permitTitle: { fontSize: 15, fontWeight: '800', marginRight: 8 },
  permitMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12 },
  decisionNotes: { fontSize: 12, marginTop: 10, lineHeight: 17 },
  cancelButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 12,
  },
  cancelText: { fontSize: 12, fontWeight: '800' },
});
