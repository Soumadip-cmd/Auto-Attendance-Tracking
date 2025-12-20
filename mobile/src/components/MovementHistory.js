import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import BackgroundLocationService from '../services/backgroundLocationService';

const MovementHistory = () => {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const data = await BackgroundLocationService.getOfflineHistory();
    const statsData = await BackgroundLocationService.getStats();
    setHistory(data);
    setStats(statsData);
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    await BackgroundLocationService.syncToServer();
    await loadHistory();
    setSyncing(false);
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  };

  const renderRoute = () => {
    if (history.length < 2) {
      return (
        <View style={styles.emptyState}>
          <MaterialIcons name="route" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No movement data yet</Text>
          <Text style={styles.emptySubText}>
            Background tracking will record your path
          </Text>
        </View>
      );
    }

    const routes = [];
    let totalDistance = 0;

    for (let i = 0; i < history.length - 1; i++) {
      const from = history[i];
      const to = history[i + 1];
      const distance = calculateDistance(
        from.latitude,
        from.longitude,
        to.latitude,
        to.longitude
      );

      totalDistance += distance;

      routes.push({
        from,
        to,
        distance,
        index: i,
      });
    }

    return (
      <View>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <MaterialIcons name="place" size={24} color="#6366f1" />
            <Text style={styles.summaryLabel}>Total Points</Text>
            <Text style={styles.summaryValue}>{history.length}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="straighten" size={24} color="#10b981" />
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>{formatDistance(totalDistance)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialIcons name="cloud-upload" size={24} color={stats?.unsynced > 0 ? '#f59e0b' : '#6366f1'} />
            <Text style={styles.summaryLabel}>Synced</Text>
            <Text style={styles.summaryValue}>
              {stats?.synced || 0}/{stats?.total || 0}
            </Text>
          </View>
        </View>

        {stats?.unsynced > 0 && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="sync" size={20} color="#fff" />
                <Text style={styles.syncText}>
                  Sync {stats.unsynced} Locations
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <ScrollView 
          style={styles.routeList}
          contentContainerStyle={styles.routeListContent}
          showsVerticalScrollIndicator={true}
        >
          {routes.map((route, idx) => (
            <View key={idx} style={styles.routeCard}>
              <View style={styles.routeHeader}>
                <MaterialIcons name="navigation" size={20} color="#6366f1" />
                <Text style={styles.routeNumber}>Movement #{idx + 1}</Text>
                <Text style={styles.routeDistance}>
                  {formatDistance(route.distance)}
                </Text>
              </View>

              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <MaterialIcons name="trip-origin" size={16} color="#10b981" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>From</Text>
                  <Text style={styles.coordinates}>
                    {route.from.latitude.toFixed(6)}, {route.from.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.timestamp}>
                    {new Date(route.from.timestamp).toLocaleString()}
                  </Text>
                  {route.from.speed > 0 && (
                    <Text style={styles.speed}>
                      Speed: {(route.from.speed * 3.6).toFixed(1)} km/h
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.arrow}>
                <MaterialIcons name="arrow-downward" size={20} color="#6366f1" />
              </View>

              <View style={styles.locationRow}>
                <View style={styles.locationIcon}>
                  <MaterialIcons name="place" size={16} color="#ef4444" />
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationLabel}>To</Text>
                  <Text style={styles.coordinates}>
                    {route.to.latitude.toFixed(6)}, {route.to.longitude.toFixed(6)}
                  </Text>
                  <Text style={styles.timestamp}>
                    {new Date(route.to.timestamp).toLocaleString()}
                  </Text>
                  {route.to.accuracy && (
                    <Text style={styles.accuracy}>
                      Accuracy: ±{route.to.accuracy.toFixed(1)}m
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.syncStatus}>
                <MaterialIcons
                  name={route.from.synced ? 'check-circle' : 'cloud-upload'}
                  size={16}
                  color={route.from.synced ? '#10b981' : '#f59e0b'}
                />
                <Text style={[
                  styles.syncLabel,
                  { color: route.from.synced ? '#10b981' : '#f59e0b' }
                ]}>
                  {route.from.synced ? 'Synced to server' : 'Pending sync'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return <View style={styles.container}>{renderRoute()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryItem: {
    alignItems: 'center',
    gap: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 2,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  syncText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  routeList: {
    flex: 1,
  },
  routeListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 10,
  },
  routeNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  routeDistance: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 4,
  },
  locationIcon: {
    marginTop: 2,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coordinates: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  speed: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
    fontWeight: '600',
  },
  accuracy: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
    fontWeight: '600',
  },
  arrow: {
    alignItems: 'center',
    marginVertical: 12,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  syncLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default MovementHistory;
