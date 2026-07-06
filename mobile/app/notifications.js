import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { useTheme } from '../src/hooks/useTheme';
import notificationService from '../src/services/notificationService';

const TYPE_META = {
  movement_permission_approved: { icon: 'checkmark-circle', color: '#10b981' },
  movement_permission_rejected: { icon: 'close-circle', color: '#ef4444' },
  geofence_violation: { icon: 'warning', color: '#ef4444' },
  permission_violation: { icon: 'warning', color: '#ef4444' },
  permission_violation_cleared: { icon: 'checkmark-circle', color: '#10b981' },
  permission_expiring: { icon: 'time', color: '#f59e0b' },
  permission_expired: { icon: 'time', color: '#64748b' },
  native_geofence: { icon: 'navigate', color: '#6366f1' },
  auto_checkin: { icon: 'log-in', color: '#10b981' },
  auto_checkout: { icon: 'log-out', color: '#ef4444' },
  check_in_reminder: { icon: 'alarm', color: '#6366f1' },
  check_out_reminder: { icon: 'alarm', color: '#6366f1' },
};

const getMeta = (type) => TYPE_META[type] || { icon: 'notifications', color: '#6366f1' };

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const items = await notificationService.getHistory();
    setHistory(items);
    setLoading(false);
    await notificationService.markAllRead();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleClear = () => {
    Alert.alert('Clear notifications', 'Remove all notification history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await notificationService.clearHistory();
          setHistory([]);
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    const meta = getMeta(item.data?.type);
    return (
      <View style={[styles.row, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.iconWrap, { backgroundColor: meta.color + '18' }]}>
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{item.title}</Text>
          <Text style={[styles.rowMessage, { color: theme.colors.textSecondary }]} numberOfLines={3}>
            {item.body}
          </Text>
          <Text style={[styles.rowTime, { color: theme.colors.textSecondary }]}>
            {item.timestamp ? formatDistanceToNow(new Date(item.timestamp), { addSuffix: true }) : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Notifications</Text>
        {history.length > 0 ? (
          <TouchableOpacity onPress={handleClear} style={styles.backButton}>
            <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, index) => String(item.id || index)}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={56} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No notifications yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Alerts for check-ins, geofence activity, and movement permissions will show up here.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  listContent: { padding: 16, flexGrow: 1 },
  row: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  rowMessage: { fontSize: 13, marginTop: 3, lineHeight: 18, fontFamily: 'Inter_400Regular' },
  rowTime: { fontSize: 11, marginTop: 6, fontFamily: 'Inter_400Regular' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', fontFamily: 'Inter_700Bold', marginTop: 12 },
  emptyText: { fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18, fontFamily: 'Inter_400Regular' },
});
