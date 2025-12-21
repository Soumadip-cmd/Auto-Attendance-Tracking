import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../src/hooks/useLocation';
import { useTheme } from '../../src/hooks/useTheme';
import { geofenceAPI } from '../../src/services/api';
import { Loading } from '../../src/components/common/Loading';
import { Card } from '../../src/components/common/Card';

const { width, height } = Dimensions.get('window');

// Simple distance calculation
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

export default function MapScreen() {
  const { location, getCurrentLocation, startTracking, stopTracking, hasPermission, requestPermissions, isTracking } = useLocation();
  const { theme } = useTheme();
  const mapRef = useRef(null);

  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(null);
  const [nearestGeofence, setNearestGeofence] = useState(null);
  const [showDetails, setShowDetails] = useState(true);

  useEffect(() => {
    loadGeofences();
    return () => {
      stopTracking(); // Clean up tracking when component unmounts
    };
  }, []);

  // Start tracking when component mounts
  useEffect(() => {
    const initializeTracking = async () => {
      if (hasPermission) {
        await startTracking((newLocation) => {
          console.log('📍 Location updated:', newLocation.latitude.toFixed(6), newLocation.longitude.toFixed(6));
        });
      }
    };
    
    initializeTracking();
  }, [hasPermission]);

  useEffect(() => {
    if (location && geofences.length > 0) {
      // Find the nearest geofence
      let nearest = null;
      let minDistance = Infinity;

      geofences.forEach(geofence => {
        const dist = getDistance(
          location.latitude,
          location.longitude,
          geofence.center.coordinates[1],
          geofence.center.coordinates[0]
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearest = {
            ...geofence,
            distance: dist,
            isInside: dist <= geofence.radius
          };
        }
      });

      setNearestGeofence(nearest);
      setDistance(minDistance);
      
      console.log('📍 YOUR LOCATION:', location.latitude.toFixed(6), location.longitude.toFixed(6));
      if (nearest) {
        console.log('🏢 NEAREST GEOFENCE:', nearest.name);
        console.log('📏 DISTANCE:', minDistance.toFixed(0), 'meters');
        console.log(minDistance <= nearest.radius ? '✅ INSIDE' : '❌ OUTSIDE');
      }
    }
  }, [location, geofences]);

  const loadGeofences = async () => {
    try {
      if (!hasPermission) {
        await requestPermissions();
      }
      
      await getCurrentLocation();
      
      const response = await geofenceAPI.getAll();
      if (response.success && response.data.length > 0) {
        setGeofences(response.data);
      } else {
        Alert.alert('No Office Locations', 'Please contact admin to set up office locations.');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Failed to load office locations');
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  const isInside = nearestGeofence && nearestGeofence.isInside;
  
  return (
    <View style={styles.container}>
      {/* Simple Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Attendance Locations</Text>
        
        {nearestGeofence && (
          <View style={styles.infoBox}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Nearest:</Text>
              <Text style={[styles.coords, { color: theme.colors.text }]}>
                {nearestGeofence.name} ({nearestGeofence.distance.toFixed(0)}m)
              </Text>
            </View>
            
            <View style={styles.row}>
              <Text style={[styles.label, { color: theme.colors.textSecondary }]}>You:</Text>
              <Text style={[styles.coords, { color: theme.colors.text }]}>
                {location ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` : 'Loading...'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Map */}
      {location && geofences.length > 0 && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          followsUserLocation={true}
          showsCompass={true}
          showsTraffic={false}
        >
          {/* All Geofences */}
          {geofences.map((geofence) => {
            const lat = geofence.center.coordinates[1];
            const lon = geofence.center.coordinates[0];
            const dist = getDistance(location.latitude, location.longitude, lat, lon);
            const inside = dist <= geofence.radius;
            
            return (
              <React.Fragment key={geofence._id}>
                {/* Geofence Circle */}
                <Circle
                  center={{ latitude: lat, longitude: lon }}
                  radius={geofence.radius}
                  fillColor={inside ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.15)'}
                  strokeColor={inside ? 'rgba(16, 185, 129, 0.8)' : 'rgba(59, 130, 246, 0.6)'}
                  strokeWidth={inside ? 3 : 2}
                />
                
                {/* Geofence Marker */}
                <Marker
                  coordinate={{ latitude: lat, longitude: lon }}
                  title={geofence.name}
                  description={`Radius: ${geofence.radius}m | ${inside ? 'You are inside' : dist.toFixed(0) + 'm away'}`}
                >
                  <View style={[
                    styles.geofenceMarker,
                    { 
                      backgroundColor: inside ? '#10b981' : '#3b82f6',
                      borderWidth: inside ? 5 : 4
                    }
                  ]}>
                    <Ionicons name="business" size={inside ? 26 : 22} color="#fff" />
                  </View>
                </Marker>
              </React.Fragment>
            );
          })}

          {/* Red Dotted Line to Nearest Geofence */}
          {nearestGeofence && !isInside && (
            <Polyline
              coordinates={[
                { latitude: location.latitude, longitude: location.longitude },
                { 
                  latitude: nearestGeofence.center.coordinates[1], 
                  longitude: nearestGeofence.center.coordinates[0] 
                }
              ]}
              strokeColor="#ef4444"
              strokeWidth={3}
              lineDashPattern={[15, 10]}
            />
          )}

        </MapView>
      )}

      {/* Distance Status */}
      {nearestGeofence && distance !== null && showDetails && (
        <View style={styles.bottomPanel}>
          <Card style={[styles.card, { 
            borderLeftWidth: 4,
            borderLeftColor: isInside ? theme.colors.success : theme.colors.error,
            backgroundColor: theme.dark ? 'rgba(31, 41, 55, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          }]}>
            {/* Close Button */}
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDetails(false)}
            >
              <Ionicons name="close-circle" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.statusRow}>
              <Ionicons 
                name={isInside ? 'checkmark-circle' : 'close-circle'} 
                size={32} 
                color={isInside ? theme.colors.success : theme.colors.error} 
              />
              <View style={styles.statusText}>
                <Text style={[styles.distanceText, { 
                  color: isInside ? theme.colors.success : theme.colors.error 
                }]}>
                  {distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`}
                </Text>
                <Text style={[styles.statusLabel, { 
                  color: isInside ? theme.colors.success : theme.colors.error 
                }]}>
                  {isInside ? `INSIDE ${nearestGeofence.name}` : 'OUTSIDE - Too Far'}
                </Text>
              </View>
            </View>
            
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            
            <View style={styles.detailsRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Location:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]} numberOfLines={1}>
                {nearestGeofence.name}
              </Text>
            </View>
            
            <View style={styles.detailsRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                Allowed Radius:
              </Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                {nearestGeofence.radius}m
              </Text>
            </View>
            
            {!isInside && (
              <View style={styles.detailsRow}>
                <Text style={[styles.detailLabel, { color: theme.colors.error }]}>
                  You need to be:
                </Text>
                <Text style={[styles.detailValue, { color: theme.colors.error, fontWeight: '700' }]}>
                  {Math.round(distance - nearestGeofence.radius)}m closer
                </Text>
              </View>
            )}
            
            {geofences.length > 1 && (
              <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            )}
            
            {geofences.length > 1 && (
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary, fontSize: 11, marginTop: 4 }]}>
                📍 Showing {geofences.length} office locations
              </Text>
            )}
          </Card>
        </View>
      )}

      {/* Toggle Details Button (when closed) */}
      {!showDetails && nearestGeofence && (
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowDetails(true)}
        >
          <Ionicons name="information-circle" size={24} color="#fff" />
          <Text style={styles.toggleBtnText}>
            {isInside ? 'Inside' : Math.round(distance) + 'm away'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Refresh Button */}
      <TouchableOpacity
        style={[styles.refreshBtn, { backgroundColor: theme.colors.primary }]}
        onPress={async () => {
          await getCurrentLocation();
          await loadGeofences();
        }}
      >
        <Ionicons name="refresh" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoBox: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    width: 70,
  },
  coords: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'monospace',
    flex: 1,
  },
  map: {
    flex: 1,
  },
  geofenceMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  yourMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  card: {
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusText: {
    flex: 1,
  },
  distanceText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  refreshBtn: {
    position: 'absolute',
    top: 70,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  toggleBtn: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toggleBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
