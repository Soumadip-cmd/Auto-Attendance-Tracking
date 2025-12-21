import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../../src/hooks/useLocation';
import { useTheme } from '../../src/hooks/useTheme';
import { locationAPI, geofenceAPI } from '../../src/services/api';
import googleMapsService from '../../src/services/googleMapsService';
import { Loading } from '../../src/components/common/Loading';
import { Card } from '../../src/components/common/Card';
import { format } from 'date-fns';

const { width, height } = Dimensions.get('window');

export default function MapScreen() {
  const { location, getCurrentLocation, hasPermission, requestPermissions } = useLocation();
  const { theme } = useTheme();
  const mapRef = useRef(null);

  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [roadDistance, setRoadDistance] = useState(null);
  const [address, setAddress] = useState(null);
  const [loadingMaps, setLoadingMaps] = useState(false);
  const [showDistancePanel, setShowDistancePanel] = useState(true);

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    // Fetch Google Maps data when location or geofence changes
    if (location && selectedGeofence) {
      fetchRoadDistance();
      fetchAddress();
    }
  }, [location, selectedGeofence]);

  const fetchRoadDistance = async () => {
    if (!location || !selectedGeofence) return;
    
    setLoadingMaps(true);
    const result = await googleMapsService.getDistance(
      { latitude: location.latitude, longitude: location.longitude },
      { latitude: selectedGeofence.center.coordinates[1], longitude: selectedGeofence.center.coordinates[0] }
    );
    
    if (result.status === 'OK') {
      setRoadDistance(result);
    } else if (result.status === 'REQUEST_DENIED') {
      console.log('⚠️ Google Maps API access denied - using fallback distance');
      // Use Haversine formula as fallback
      const fallbackDistance = googleMapsService.calculateHaversineDistance(
        location.latitude,
        location.longitude,
        selectedGeofence.center.coordinates[1],
        selectedGeofence.center.coordinates[0]
      );
      setRoadDistance({
        status: 'FALLBACK',
        distance: fallbackDistance,
        distanceText: (fallbackDistance / 1000).toFixed(2) + ' km',
        durationText: 'N/A',
        isFallback: true
      });
    }
    setLoadingMaps(false);
  };

  const fetchAddress = async () => {
    if (!selectedGeofence) return;
    
    const result = await googleMapsService.getAddressFromCoordinates(
      selectedGeofence.center.coordinates[1],
      selectedGeofence.center.coordinates[0]
    );
    
    if (result.status === 'OK') {
      setAddress(result.address);
    }
  };

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

  // Check if inside geofence using Google Maps distance
  const isInsideGeofence = roadDistance && selectedGeofence && roadDistance.distance <= selectedGeofence.radius;
  
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

      {/* Distance Result Box - Compact */}
      {showDistancePanel && selectedGeofence && (
        <View style={styles.distanceContainer}>
          <Card style={[styles.distanceCard, { 
            borderLeftWidth: 3, 
            borderLeftColor: isInsideGeofence ? theme.colors.success : theme.colors.error,
            backgroundColor: theme.dark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          }]}>
            {/* Compact Header */}
            <View style={styles.distanceHeader}>
              <View style={styles.compactHeaderContent}>
                <Ionicons 
                  name={isInsideGeofence ? "checkmark-circle" : "alert-circle"} 
                  size={18} 
                  color={isInsideGeofence ? theme.colors.success : theme.colors.error} 
                />
                <Text style={[styles.distanceTitleCompact, { color: theme.colors.text }]}>
                  Distance
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowDistancePanel(false)}
                  style={[styles.closeButtonCompact, { 
                    backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          
            {/* Compact Content */}
            <View style={styles.distanceContentCompact}>
            {loadingMaps ? (
              <View style={styles.compactLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.compactText, { color: theme.colors.textSecondary }]}>
                  Calculating...
                </Text>
              </View>
            ) : roadDistance ? (
              <View style={styles.compactInfo}>
                {/* Distance Value */}
                <View style={styles.compactRow}>
                  <Text style={[styles.distanceValueCompact, { 
                    color: isInsideGeofence ? theme.colors.success : theme.colors.error 
                  }]}>
                    {roadDistance.distanceText}
                  </Text>
                  <View style={[styles.statusDotCompact, { 
                    backgroundColor: isInsideGeofence ? theme.colors.success : theme.colors.error 
                  }]} />
                </View>
                
                {/* Additional Info Row */}
                <View style={styles.compactDetailsRow}>
                  {!roadDistance.isFallback && roadDistance.durationText && (
                    <View style={styles.compactDetail}>
                      <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.compactDetailText, { color: theme.colors.textSecondary }]}>
                        {roadDistance.durationText}
                      </Text>
                    </View>
                  )}
                  <View style={styles.compactDetail}>
                    <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
                    <Text style={[styles.compactDetailText, { color: theme.colors.textSecondary }]}>
                      Radius: {selectedGeofence?.radius}m
                    </Text>
                  </View>
                </View>
                
                {/* Fallback Warning (if applicable) */}
                {roadDistance.isFallback && (
                  <View style={styles.compactWarning}>
                    <Ionicons name="warning" size={10} color="#fbbf24" />
                    <Text style={[styles.compactWarningText, { color: '#fbbf24' }]}>
                      Straight-line
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.compactLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.compactText, { color: theme.colors.textSecondary }]}>
                  Loading...
                </Text>
              </View>
            )}
            </View>
          </Card>
        </View>
      )}

      {/* Toggle Distance Panel Button (when hidden) */}
      {!showDistancePanel && selectedGeofence && (
        <TouchableOpacity 
          style={[styles.toggleButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowDistancePanel(true)}
        >
          <Ionicons name="information-circle" size={24} color="#fff" />
          <Text style={styles.toggleButtonText}>Show Distance</Text>
        </TouchableOpacity>
      )}

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
    padding: 10,
    paddingHorizontal: 12,
  },
  distanceHeader: {
    marginBottom: 8,
  },
  compactHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distanceTitleCompact: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  closeButtonCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceContentCompact: {
    gap: 6,
  },
  compactLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '500',
  },
  compactInfo: {
    gap: 6,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  distanceValueCompact: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusDotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  compactDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactDetailText: {
    fontSize: 11,
    fontWeight: '500',
  },
  compactWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
  },
  compactWarningText: {
    fontSize: 10,
    fontWeight: '600',
  },
  distanceValue: {
    fontSize: 36,
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  warningText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  infoBox: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  infoText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoSubText: {
    fontSize: 13,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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
  toggleButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
