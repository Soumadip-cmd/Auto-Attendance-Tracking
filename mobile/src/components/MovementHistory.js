import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { subDays } from 'date-fns';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { liveTrackingAPI } from '../services/api';
const MovementHistory = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  useEffect(() => {
    loadHistory();
  }, [user]);
  const loadHistory = async () => {
    setLoading(true);
    try {
      const teacherId = user?._id || user?.id;
      if (!teacherId) {
        setHistory([]);
        setStats({ total: 0, synced: 0, unsynced: 0 });
        return;
      }

      const now = new Date();
      const response = await liveTrackingAPI.getTeacherTrail(teacherId, {
        startTime: subDays(now, 7).toISOString(),
        endTime: now.toISOString(),
        limit: 700,
      });
      const points = response?.data?.points || [];
      const normalized = points.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        altitude: point.altitude,
        speed: point.speed,
        heading: point.heading,
        timestamp: point.timestamp,
        synced: true,
      })).filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
      setHistory(normalized);
      setStats({ total: normalized.length, synced: normalized.length, unsynced: 0 });
    } catch (error) {
      setHistory([]);
      setStats({ total: 0, synced: 0, unsynced: 0 });
    } finally {
      setLoading(false);
    }
  };
  const handleSync = async () => {
    setSyncing(true);
    await loadHistory();
    setSyncing(false);
  };
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };
  const formatDistance = meters => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };
  const renderRoute = () => {
    if (history.length < 2) {
      return <View style={styles.emptyState}>
          <MaterialIcons name="route" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No movement data yet</Text>
          <Text style={[styles.emptySubText, { color: theme.colors.textSecondary }]}>
            Live tracking will record your path when it is enabled
          </Text>
        </View>;
    }
    const routes = [];
    let totalDistance = 0;
    for (let i = 0; i < history.length - 1; i++) {
      const from = history[i];
      const to = history[i + 1];
      const distance = calculateDistance(from.latitude, from.longitude, to.latitude, to.longitude);
      totalDistance += distance;
      routes.push({
        from,
        to,
        distance,
        index: i
      });
    }
    return <View>
        <View style={[styles.summary, {
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.border
      }]}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="place" size={24} color={theme.colors.primary} />
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Total Points</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{history.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="straighten" size={24} color={theme.colors.success} />
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Distance</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>{formatDistance(totalDistance)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="cloud-upload" size={24} color={stats?.unsynced > 0 ? theme.colors.warning : theme.colors.primary} />
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Synced</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {stats?.synced || 0}/{stats?.total || 0}
            </Text>
          </View>
        </View>

        {stats?.unsynced > 0 && <TouchableOpacity style={[styles.syncButton, { backgroundColor: theme.colors.primary }]} onPress={handleSync} disabled={syncing}>
            {syncing ? <ActivityIndicator color="#fff" /> : <>
                <MaterialIcons name="sync" size={20} color="#fff" />
                <Text style={styles.syncText}>
                  Sync {stats.unsynced} Locations
                </Text>
              </>}
          </TouchableOpacity>}

        <ScrollView style={styles.routeList} contentContainerStyle={styles.routeListContent} showsVerticalScrollIndicator={true}>
          {routes.map((route, idx) => <View key={idx} style={[styles.routeCard, {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border
        }]}>
              <View style={[styles.routeHeader, { borderBottomColor: theme.colors.border }]}>
                <MaterialIcons name="navigation" size={20} color={theme.colors.primary} />
                <Text style={[styles.routeNumber, { color: theme.colors.text }]}>Movement #{idx + 1}</Text>
                <Text style={[styles.routeDistance, {
              color: theme.colors.primary,
              backgroundColor: theme.colors.primary + '18'
            }]}>
                  {formatDistance(route.distance)}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <MaterialIcons name="trip-origin" size={16} color="#10b981" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>From</Text>
                  <Text style={[styles.coordinates, { color: theme.colors.text }]}>
                    {route.from.latitude.toFixed(6)}, {route.from.longitude.toFixed(6)}
                  </Text>
                  <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                    {new Date(route.from.timestamp).toLocaleString()}
                  </Text>
                  {route.from.speed > 0 && <Text style={styles.speed}>
                      Speed: {(route.from.speed * 3.6).toFixed(1)} km/h
                    </Text>}
                </View>
              </View>

              <View style={styles.arrow}>
                <MaterialIcons name="arrow-downward" size={20} color={theme.colors.primary} />
              </View>

              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <MaterialIcons name="place" size={16} color="#ef4444" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>To</Text>
                  <Text style={[styles.coordinates, { color: theme.colors.text }]}>
                    {route.to.latitude.toFixed(6)}, {route.to.longitude.toFixed(6)}
                  </Text>
                  <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
                    {new Date(route.to.timestamp).toLocaleString()}
                  </Text>
                  {route.to.accuracy && <Text style={styles.accuracy}>
                      Accuracy: +/-{route.to.accuracy.toFixed(1)}m
                    </Text>}
                </View>
              </View>

              <View style={[styles.syncStatus, { borderTopColor: theme.colors.border }]}>
                <MaterialIcons name={route.from.synced ? 'check-circle' : 'cloud-upload'} size={16} color={route.from.synced ? '#10b981' : '#f59e0b'} />
                <Text style={[styles.syncLabel, {
              color: route.from.synced ? '#10b981' : '#f59e0b'
            }]}>
                  {route.from.synced ? 'Synced to server' : 'Pending sync'}
                </Text>
              </View>
            </View>)}
        </ScrollView>
      </View>;
  };
  if (loading) {
    return <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>;
  }
  return <View style={[styles.container, { backgroundColor: theme.colors.background }]}>{renderRoute()}</View>;
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1
    },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
    fontFamily: "Inter_500Medium"
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: "Inter_700Bold",
    color: '#1e293b',
    marginTop: 2
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 3,
    shadowColor: '#6366f1',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  syncText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  routeList: {
    flex: 1
  },
  routeListContent: {
    padding: 16,
    paddingBottom: 100
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10
  },
  routeNumber: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: "Inter_700Bold",
    color: '#1e293b',
    flex: 1
  },
  routeDistance: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: "Inter_700Bold",
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4
  },
  locationIcon: {
    marginTop: 2
  },
  locationInfo: {
    flex: 1
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: "Inter_700Bold",
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  coordinates: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace',
    marginBottom: 4
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
    fontFamily: "Inter_500Medium"
  },
  speed: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  accuracy: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  arrow: {
    alignItems: 'center',
    marginVertical: 12
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  syncLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold",
    color: '#64748b',
    marginTop: 16
  },
  emptySubText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: "Inter_400Regular"
  }
});
export default MovementHistory;
