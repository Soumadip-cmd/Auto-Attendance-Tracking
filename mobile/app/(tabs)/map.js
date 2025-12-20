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

export default function MapScreen() {
  const { location, getCurrentLocation, hasPermission, requestPermissions, startTracking, stopTracking, isTracking } = useLocation();
  const { theme } = useTheme();
  const mapRef = useRef(null);

  const [locationHistory, setLocationHistory] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [trackingPath, setTrackingPath] = useState([]);

  useEffect(() => {
    initializeMap();
  }, []);

  const initializeMap = async () => {
    try {
      if (!hasPermission) {
        await requestPermissions();
      }
      
      await getCurrentLocation();
      await loadGeofences();
      await loadLocationHistory();
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Error', 'Failed to initialize map');
      setLoading(false);
    }
  };

  const loadGeofences = async () => {
    try {
      const response = await geofenceAPI.getAll();
      if (response.success) {
        setGeofences(response.data);
      }
    } catch (error) {
      console.error('Error loading geofences:', error);
    }
  };

  const loadLocationHistory = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const response = await locationAPI.getHistory({
        startDate: today.toISOString(),
        limit: 100,
      });
      
      if (response.success) {
        setLocationHistory(response.data);
      }
    } catch (error) {
      console.error('Error loading location history:', error);
    }
  };

  const handleStartLiveTracking = async () => {
    try {
      await startTracking((newLocation) => {
        setTrackingPath(prev => [...prev, {
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
        }]);
        
        // Center map on new location
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 500);
        }
      });
      
      setIsLiveTracking(true);
      Alert.alert('Live Tracking Started', 'Your location is being tracked');
    } catch (error) {
      Alert.alert('Error', 'Failed to start live tracking');
    }
  };

  const handleStopLiveTracking = () => {
    stopTracking();
    setIsLiveTracking(false);
    Alert.alert('Live Tracking Stopped', 'Location tracking has been stopped');
  };

  const centerOnCurrentLocation = async () => {
    try {
      const loc = await getCurrentLocation();
      if (mapRef.current && loc) {
        mapRef.current.animateToRegion({
          latitude: loc.latitude,
          longitude: loc.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  if (loading) {
    return <Loading />;
  }

  const mapRegion = location ? {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : null;

  return (
    <View style={styles.container}>
      {/* Map View */}
      {mapRegion && (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass
          loadingEnabled
        >
          {/* Current Location Marker */}
          {location && (
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="You are here"
              description={`Accuracy: ${Math.round(location.accuracy)}m`}
              pinColor={theme.colors.primary}
            >
              <View style={[styles.customMarker, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
            </Marker>
          )}

          {/* Geofences */}
          {geofences.map((geofence) => (
            <React.Fragment key={geofence._id}>
              <Circle
                center={{
                  latitude: geofence.center.coordinates[1],
                  longitude: geofence.center.coordinates[0],
                }}
                radius={geofence.radius}
                fillColor="rgba(100, 200, 100, 0.2)"
                strokeColor="rgba(100, 200, 100, 0.8)"
                strokeWidth={2}
              />
              <Marker
                coordinate={{
                  latitude: geofence.center.coordinates[1],
                  longitude: geofence.center.coordinates[0],
                }}
                title={geofence.name}
                description={`Radius: ${geofence.radius}m`}
              >
                <View style={[styles.geofenceMarker, { backgroundColor: theme.colors.success }]}>
                  <Ionicons name="business" size={16} color="#fff" />
                </View>
              </Marker>
            </React.Fragment>
          ))}

          {/* Location History Path */}
          {locationHistory.length > 1 && (
            <Polyline
              coordinates={locationHistory.map(loc => ({
                latitude: loc.location.coordinates[1],
                longitude: loc.location.coordinates[0],
              }))}
              strokeColor={theme.colors.primary}
              strokeWidth={3}
              lineDashPattern={[1, 5]}
            />
          )}

          {/* Live Tracking Path */}
          {trackingPath.length > 1 && (
            <Polyline
              coordinates={trackingPath}
              strokeColor={theme.colors.error}
              strokeWidth={4}
            />
          )}
        </MapView>
      )}

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, { backgroundColor: theme.colors.card, ...theme.shadows.md }]}
          onPress={centerOnCurrentLocation}
        >
          <Ionicons name="locate" size={24} color={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.trackingButton,
            {
              backgroundColor: isLiveTracking ? theme.colors.error : theme.colors.success,
              ...theme.shadows.lg,
            },
          ]}
          onPress={isLiveTracking ? handleStopLiveTracking : handleStartLiveTracking}
        >
          <Ionicons
            name={isLiveTracking ? 'stop-circle' : 'play-circle'}
            size={28}
            color="#fff"
          />
          <Text style={styles.trackingButtonText}>
            {isLiveTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Ionicons name="location" size={16} color={theme.colors.primary} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Accuracy
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {location ? `${Math.round(location.accuracy)}m` : 'N/A'}
              </Text>
            </View>
            
            <View style={styles.infoDivider} />
            
            <View style={styles.infoItem}>
              <Ionicons name="business" size={16} color={theme.colors.success} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Geofences
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {geofences.length}
              </Text>
            </View>
            
            <View style={styles.infoDivider} />
            
            <View style={styles.infoItem}>
              <Ionicons name="navigate" size={16} color={theme.colors.primary} />
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
                Today's Track
              </Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>
                {locationHistory.length}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  customMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  geofenceMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  controls: {
    position: 'absolute',
    right: 16,
    top: 60,
    alignItems: 'flex-end',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 8,
  },
  trackingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  infoCard: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  infoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
  },
});
