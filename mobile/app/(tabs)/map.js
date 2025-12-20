import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../src/hooks/useLocation';
import { useTheme } from '../../src/hooks/useTheme';
import { locationAPI, geofenceAPI } from '../../src/services/api';
import { Loading } from '../../src/components/common/Loading';
import { Card } from '../../src/components/common/Card';
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');

// Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // If coordinates are identical or extremely close, return 0
  if (Math.abs(lat1 - lat2) < 0.0000001 && Math.abs(lon1 - lon2) < 0.0000001) {
    return 0;
  }
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in meters
  
  // Round to nearest meter, treat < 5m as 0 (GPS accuracy threshold)
  return distance < 5 ? 0 : Math.round(distance);
};

export default function MapScreen() {
  const { location, getCurrentLocation, hasPermission, requestPermissions } = useLocation();
  const { theme } = useTheme();
  const mapRef = useRef(null);

  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(null);
  const [selectedGeofence, setSelectedGeofence] = useState(null);

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    // Calculate distance when location or geofence changes
    if (location && selectedGeofence) {
      const dist = calculateDistance(
        location.latitude,
        location.longitude,
        selectedGeofence.center.coordinates[1],
        selectedGeofence.center.coordinates[0]
      );
      setDistance(dist);
    }
  }, [location, selectedGeofence]);

  const initializeMap = async () => {
    try {
      console.log('🗺️ ========== MAP INITIALIZING ==========');
      
      if (!hasPermission) {
        console.log('📍 No permission - requesting...');
        await requestPermissions();
      } else {
        console.log('✅ Location permission already granted');
      }
      
      console.log('📍 Getting current location...');
      const currentLocation = await getCurrentLocation();
      
      console.log('📍 ========== LOCATION DETAILS ==========');
      console.log('📍 Full Location Object:', JSON.stringify(currentLocation, null, 2));
      console.log('  ├─ Latitude:', currentLocation?.coords?.latitude);
      console.log('  ├─ Longitude:', currentLocation?.coords?.longitude);
      console.log('  ├─ Accuracy:', currentLocation?.coords?.accuracy, 'meters');
      console.log('  ├─ Altitude:', currentLocation?.coords?.altitude);
      console.log('  ├─ Speed:', currentLocation?.coords?.speed);
      console.log('  ├─ Heading:', currentLocation?.coords?.heading);
      console.log('  └─ Timestamp:', currentLocation?.timestamp);
      console.log('========================================');
      
      await loadGeofences();
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      Alert.alert('Error', 'Failed to initialize map');
      setLoading(false);
    }
  };

  const loadGeofences = async () => {
    try {
      const response = await geofenceAPI.getAll();
      if (response.success && response.data.length > 0) {
        setGeofences(response.data);
        setSelectedGeofence(response.data[0]); // Select first geofence by default
      }
    } catch (error) {
      console.error('Error loading geofences:', error);
    }
  };

  const centerOnBothLocations = () => {
    if (mapRef.current && location && selectedGeofence) {
      const coordinates = [
        {
          latitude: location.latitude,
          longitude: location.longitude,
        },
        {
          latitude: selectedGeofence.center.coordinates[1],
          longitude: selectedGeofence.center.coordinates[0],
        },
      ];

      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  };

  useEffect(() => {
    if (location && selectedGeofence) {
      centerOnBothLocations();
    }
  }, [location, selectedGeofence]);

  if (loading) {
    return <Loading />;
  }

  const mapRegion = location ? {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : null;

  const formatDistance = (meters) => {
    if (meters === null) return 'N/A';
    if (meters === 0) return 'At Location';
    if (meters < 1000) {
      return `${meters} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const isInsideGeofence = distance !== null && selectedGeofence && distance <= selectedGeofence.radius;
  return (
    <View style={styles.container}>
      {/* Location Info Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <View style={styles.headerRow}>
          <View style={styles.locationInfo}>
            <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>
              Site Location
            </Text>
            <Text style={[styles.locationCoords, { color: theme.colors.text }]}>
              {selectedGeofence ? 
                `${selectedGeofence.center.coordinates[1].toFixed(6)}, ${selectedGeofence.center.coordinates[0].toFixed(6)}` 
                : 'Not available'}
            </Text>
            <Text style={[styles.locationName, { color: theme.colors.primary }]}>
              {selectedGeofence?.name || 'No site selected'}
            </Text>
          </View>
        </View>
        
        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
        
        <View style={styles.headerRow}>
          <View style={styles.locationInfo}>
            <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>
              Employee Location
            </Text>
            <Text style={[styles.locationCoords, { color: theme.colors.text }]}>
              {location ? 
                `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}` 
                : 'Getting location...'}
            </Text>
            <Text style={[styles.locationAccuracy, { color: theme.colors.success }]}>
              Accuracy: {location ? `±${Math.round(location.accuracy)}m` : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Map View */}
      {mapRegion && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          loadingEnabled
        >
          {/* Site/College Location with Geofence Circle */}
          {selectedGeofence && (
            <>
              <Circle
                center={{
                  latitude: selectedGeofence.center.coordinates[1],
                  longitude: selectedGeofence.center.coordinates[0],
                }}
                radius={selectedGeofence.radius}
                fillColor="rgba(59, 130, 246, 0.2)"
                strokeColor="rgba(59, 130, 246, 0.8)"
                strokeWidth={2}
              />
              <Marker
                coordinate={{
                  latitude: selectedGeofence.center.coordinates[1],
                  longitude: selectedGeofence.center.coordinates[0],
                }}
                title={selectedGeofence.name}
                description={`Radius: ${selectedGeofence.radius}m`}
              >
                <View style={styles.siteMarker}>
                  <Ionicons name="location" size={28} color="#fff" />
                </View>
              </Marker>
            </>
          )}

          {/* Employee Current Location */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Your Location"
              description={`Accuracy: ${Math.round(location.accuracy)}m`}
            >
              <View style={styles.employeeMarker}>
                <Ionicons name="navigate-circle" size={28} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Line connecting both locations */}
          {location && selectedGeofence && (
            <Polyline
              coordinates={[
                {
                  latitude: selectedGeofence.center.coordinates[1],
                  longitude: selectedGeofence.center.coordinates[0],
                },
                {
                  latitude: location.latitude,
                  longitude: location.longitude,
                },
              ]}
              strokeColor={isInsideGeofence ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              lineDashPattern={[10, 5]}
            />
          )}
        </MapView>
      )}

      {/* Distance Result Box */}
      <View style={styles.distanceContainer}>
        <Card style={[styles.distanceCard, { 
          borderLeftWidth: 4, 
          borderLeftColor: isInsideGeofence ? theme.colors.success : theme.colors.error 
        }]}>
          <View style={styles.distanceHeader}>
            <Ionicons 
              name={isInsideGeofence ? "checkmark-circle" : "alert-circle"} 
              size={24} 
              color={isInsideGeofence ? theme.colors.success : theme.colors.error} 
            />
            <Text style={[styles.distanceTitle, { color: theme.colors.text }]}>
              Distance from Site
            </Text>
          </View>
          
          <View style={styles.distanceContent}>
            <Text style={[styles.distanceValue, { 
              color: isInsideGeofence ? theme.colors.success : theme.colors.error 
            }]}>
              {formatDistance(distance)}
            </Text>
            
            <View style={styles.distanceDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                  Geofence Radius: {selectedGeofence ? `${selectedGeofence.radius}m` : 'N/A'}
                </Text>
              </View>
              
              <View style={styles.statusBadge}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: isInsideGeofence ? theme.colors.success : theme.colors.error }
                ]} />
                <Text style={[styles.statusText, { 
                  color: isInsideGeofence ? theme.colors.success : theme.colors.error 
                }]}>
                  {isInsideGeofence ? 'Inside Geofence' : 'Outside Geofence'}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </View>

      {/* Refresh Button */}
      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: theme.colors.primary }]}
        onPress={async () => {
          await getCurrentLocation();
          centerOnBothLocations();
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
  headerRow: {
    paddingVertical: 8,
  },
  locationInfo: {
    gap: 4,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  locationCoords: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  locationName: {
    fontSize: 16,
    fontWeight: '700',
  },
  locationAccuracy: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  map: {
    flex: 1,
  },
  siteMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
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
  employeeMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ef4444',
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
  distanceContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  distanceCard: {
    padding: 20,
  },
  distanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  distanceTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  distanceContent: {
    gap: 16,
  },
  distanceValue: {
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -1,
  },
  distanceDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  refreshButton: {
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
});
