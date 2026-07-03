import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { useTheme } from '../hooks/useTheme';
import { geofenceAPI } from '../services/api';
import { Loading } from '../components/common/Loading';
import { Card } from '../components/common/Card';
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
export default function MapScreenWeb() {
  const {
    location,
    getCurrentLocation,
    hasPermission,
    requestPermissions
  } = useLocation();
  const {
    theme
  } = useTheme();
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadGeofences = async () => {
    try {
      setLoading(true);
      if (!hasPermission) {
        await requestPermissions();
      }
      await getCurrentLocation();
      const response = await geofenceAPI.getAll();
      setGeofences(response?.success ? response.data || [] : []);
    } catch (error) {
      console.error('Web map load error:', error);
      Alert.alert('Error', 'Failed to load attendance locations');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadGeofences();
  }, []);
  const locations = useMemo(() => {
    return geofences.map(geofence => {
      const latitude = geofence.center?.coordinates?.[1];
      const longitude = geofence.center?.coordinates?.[0];
      const distance = location && Number.isFinite(latitude) && Number.isFinite(longitude) ? getDistance(location.latitude, location.longitude, latitude, longitude) : null;
      return {
        ...geofence,
        latitude,
        longitude,
        distance,
        isInside: distance !== null ? distance <= geofence.radius : false
      };
    }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [geofences, location]);
  if (loading) {
    return <Loading />;
  }
  const nearest = locations[0];
  return <ScrollView style={[styles.container, {
    backgroundColor: theme.colors.background
  }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, {
        color: theme.colors.text
      }]}>Attendance Locations</Text>
        <TouchableOpacity style={[styles.refreshButton, {
        backgroundColor: theme.colors.primary
      }]} onPress={loadGeofences}>
          <Ionicons name="refresh" size={18} color="#ffffff" />
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={[styles.summaryIcon, {
          backgroundColor: nearest?.isInside ? theme.colors.success : theme.colors.info
        }]}>
            <Ionicons name={nearest?.isInside ? 'checkmark' : 'location'} size={22} color="#ffffff" />
          </View>
          <View style={styles.summaryText}>
            <Text style={[styles.summaryTitle, {
            color: theme.colors.text
          }]}>
              {nearest ? nearest.name : 'No office locations'}
            </Text>
            <Text style={[styles.summarySubtitle, {
            color: theme.colors.textSecondary
          }]}>
              {nearest?.distance != null ? `${Math.round(nearest.distance)}m away` : 'Location unavailable in this browser'}
            </Text>
          </View>
        </View>
      </Card>

      {location && <Card style={styles.locationCard}>
          <Text style={[styles.sectionLabel, {
        color: theme.colors.textSecondary
      }]}>Your Location</Text>
          <Text style={[styles.coordinates, {
        color: theme.colors.text
      }]}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        </Card>}

      <View style={styles.list}>
        {locations.map(geofence => <Card key={geofence._id} style={styles.locationItem}>
            <View style={styles.locationHeader}>
              <View>
                <Text style={[styles.locationName, {
              color: theme.colors.text
            }]}>{geofence.name}</Text>
                <Text style={[styles.locationMeta, {
              color: theme.colors.textSecondary
            }]}>
                  Radius {geofence.radius}m
                </Text>
              </View>
              <View style={[styles.badge, {
            backgroundColor: geofence.isInside ? `${theme.colors.success}20` : `${theme.colors.error}20`
          }]}>
                <Text style={[styles.badgeText, {
              color: geofence.isInside ? theme.colors.success : theme.colors.error
            }]}>
                  {geofence.isInside ? 'Inside' : 'Outside'}
                </Text>
              </View>
            </View>

            <View style={styles.detailsRow}>
              <Text style={[styles.detailText, {
            color: theme.colors.textSecondary
          }]}>
                {Number.isFinite(geofence.latitude) && Number.isFinite(geofence.longitude) ? `${geofence.latitude.toFixed(6)}, ${geofence.longitude.toFixed(6)}` : 'Coordinates unavailable'}
              </Text>
              {geofence.distance != null && <Text style={[styles.distanceText, {
            color: theme.colors.text
          }]}>
                  {geofence.distance >= 1000 ? `${(geofence.distance / 1000).toFixed(2)} km` : `${Math.round(geofence.distance)} m`}
                </Text>}
            </View>
          </Card>)}
      </View>
    </ScrollView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8
  },
  refreshText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  summaryCard: {
    padding: 18
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryText: {
    flex: 1
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  summarySubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "Inter_400Regular"
  },
  locationCard: {
    padding: 16
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: "Inter_700Bold",
    textTransform: 'uppercase'
  },
  coordinates: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: 'monospace'
  },
  list: {
    gap: 12
  },
  locationItem: {
    padding: 16
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  locationMeta: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Inter_400Regular"
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  },
  detailsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular"
  },
  distanceText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: "Inter_700Bold"
  }
});
