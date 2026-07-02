import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import MapView, { Marker, Circle, Polyline, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useLocation } from '../hooks/useLocation';
import { useTheme } from '../hooks/useTheme';
import { geofenceAPI } from '../services/api';
import TeacherLiveTrackingService from '../services/teacherLiveTrackingService';
import { Card } from '../components/common/Card';
import * as AndroidGeofencing from 'android-geofencing';

// Fallback region shown while waiting for real GPS (centre of India)
const DEFAULT_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };

const { width, height } = Dimensions.get('window');
const MAX_TRAIL_POINTS = 120;
const MIN_MOVE_METERS = 1;
const MAP_TILE_TIMEOUT_MS = 12000;
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const STATUS_META = {
  info: { icon: 'information-circle', color: '#2563eb', backgroundColor: '#dbeafe' },
  success: { icon: 'checkmark-circle', color: '#16a34a', backgroundColor: '#dcfce7' },
  warning: { icon: 'warning', color: '#d97706', backgroundColor: '#fef3c7' },
  error: { icon: 'alert-circle', color: '#dc2626', backgroundColor: '#fee2e2' },
};

const withTimeout = (promise, ms, message = 'Request timed out') => (
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ])
);

const normalizeGeofenceList = (response) => {
  const list = response?.data?.data || response?.data || response?.geofences || [];
  return Array.isArray(list)
    ? list.filter((geofence) =>
        geofence?.center?.coordinates?.length === 2 &&
        Number.isFinite(Number(geofence.center.coordinates[0])) &&
        Number.isFinite(Number(geofence.center.coordinates[1]))
      )
    : [];
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getBearing = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => d * Math.PI / 180;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

export default function MapScreen() {
  const {
    location,
    getCurrentLocation,
    startTracking,
    stopTracking,
    hasPermission,
    requestPermissions,
    error: locationError,
  } = useLocation();
  const { theme } = useTheme();
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const prevLocationRef = useRef(null);
  const isFollowingRef = useRef(true);
  const hasInitialCameraRef = useRef(false); // jumps map on very first GPS fix

  const [geofences, setGeofences] = useState([]);
  const [geofencesLoading, setGeofencesLoading] = useState(false);
  const [statusPopup, setStatusPopup] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapTilesLoaded, setMapTilesLoaded] = useState(false);
  const [useOsmFallback, setUseOsmFallback] = useState(false);
  const [distance, setDistance] = useState(null);
  const [nearestGeofence, setNearestGeofence] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [locationHistory, setLocationHistory] = useState([]);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const [walkingState, setWalkingState] = useState('UNKNOWN');

  // Stable coordinate for the Marker's coordinate prop — set once, never changed.
  // All subsequent movement is done via animateMarkerToCoordinate (smooth slide).
  const [markerCoord, setMarkerCoord] = useState(null);
  // tracksViewChanges must be true briefly whenever rotation/heading changes so
  // the native view re-renders with the updated rotation.
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const tracksTimerRef = useRef(null);
  const statusTimerRef = useRef(null);
  const mapTileTimerRef = useRef(null);
  const hasShownMovementRef = useRef(false);

  // Pulsing accuracy circle animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const showStatusPopup = useCallback((type, title, message, persistent = false) => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }

    setStatusPopup({ type, title, message });

    if (!persistent) {
      statusTimerRef.current = setTimeout(() => {
        setStatusPopup(null);
        statusTimerRef.current = null;
      }, 3500);
    }
  }, []);

  const initializeLiveMap = useCallback(async () => {
    try {
      showStatusPopup('info', 'Starting live map', 'Getting GPS and live movement ready.');
      const permission = hasPermission ? { foreground: true } : await requestPermissions();
      if (!permission?.foreground) {
        showStatusPopup('error', 'Location blocked', 'Allow location permission to move the marker.', true);
        Alert.alert('Location permission needed', 'Allow location permission to show live movement on the map.');
        return;
      }

      await getCurrentLocation();
      await startTracking();
      showStatusPopup('success', 'Live movement active', 'Marker will follow your current location.');

      TeacherLiveTrackingService.startTracking().catch((error) => {
        console.warn('Live tracking stream could not start:', error?.message);
        showStatusPopup('warning', 'Server stream issue', error?.message || 'Live admin stream could not start.');
      });
    } catch (error) {
      console.warn('Map live tracking init failed:', error?.message);
      showStatusPopup('error', 'Live map error', error?.message || 'Could not start live location.', true);
    }
  }, [getCurrentLocation, hasPermission, requestPermissions, showStatusPopup, startTracking]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Jump the camera as soon as the map is ready.
  // Does NOT touch hasInitialCameraRef — the location effect owns that flag.
  const onMapReady = useCallback(async () => {
    try {
      setIsMapReady(true);
      showStatusPopup('success', 'Map loaded', 'Waiting for your current location.');
      if (mapTileTimerRef.current) clearTimeout(mapTileTimerRef.current);
      mapTileTimerRef.current = setTimeout(() => {
        setUseOsmFallback(true);
        showStatusPopup(
          'warning',
          'Google tiles blocked',
          'Showing fallback map. Check Maps SDK, billing, and EAS SHA-1.',
          true
        );
      }, MAP_TILE_TIMEOUT_MS);
      // Try cache first (instant), then fresh fix if cache is empty
      let pos = await Location.getLastKnownPositionAsync({}).catch(() => null);
      if (!pos) {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }).catch(() => null);
      }
      if (pos && mapRef.current) {
        const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        isFollowingRef.current = true;
        mapRef.current.animateCamera({ center: coord, zoom: 18 }, { duration: 400 });
        showStatusPopup('success', 'Map loaded', 'Current location centered on the map.');
      }
    } catch (error) {
      setIsMapReady(true);
      showStatusPopup('warning', 'Map loaded', error?.message || 'GPS fix is not ready yet.');
    }
  }, [showStatusPopup]);

  const onMapLoaded = useCallback(() => {
    setMapTilesLoaded(true);
    if (mapTileTimerRef.current) {
      clearTimeout(mapTileTimerRef.current);
      mapTileTimerRef.current = null;
    }
    if (!useOsmFallback) {
      showStatusPopup('success', 'Map tiles loaded', 'Google map tiles are visible.');
    }
  }, [showStatusPopup, useOsmFallback]);

  useEffect(() => {
    // Load geofences and activity detection in background — map renders immediately
    initializeLiveMap();
    loadGeofences();
    startActivityDetection();

    return () => {
      stopTracking();
      AndroidGeofencing.stopWalkingDetection().catch(() => null);
      if (tracksTimerRef.current) clearTimeout(tracksTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (mapTileTimerRef.current) clearTimeout(mapTileTimerRef.current);
      // Reset so re-opening the tab gets a fresh camera jump
      hasInitialCameraRef.current = false;
      isFollowingRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (hasPermission) {
      startTracking();
    }
  }, [hasPermission, startTracking]);

  useEffect(() => {
    if (locationError) {
      showStatusPopup('error', 'Location error', locationError, true);
    }
  }, [locationError, showStatusPopup]);

  // Google Activity Recognition listener
  useEffect(() => {
    const sub = AndroidGeofencing.addWalkingListener((event) => {
      if (event.transition === 'ENTER') {
        setWalkingState(event.activity);
      } else if (event.transition === 'EXIT' && event.activity === walkingState) {
        setWalkingState('STILL');
      }
    });
    return () => sub.remove();
  }, [walkingState]);

  const startActivityDetection = async () => {
    if (Platform.OS !== 'android') return;
    try {
      if (Platform.Version >= 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
          {
            title: 'Activity Detection',
            message: 'GeoAttend uses Google Activity Recognition to detect when you are walking.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }
      await AndroidGeofencing.startWalkingDetection();
    } catch (e) {
      console.warn('Activity detection unavailable:', e?.message);
    }
  };

  // Live movement: update trail, heading, camera whenever location changes
  useEffect(() => {
    if (!location) return;

    const newCoord = { latitude: location.latitude, longitude: location.longitude };
    const prev = prevLocationRef.current;

    // ── First real GPS fix ─────────────────────────────────────────────────────
    if (!hasInitialCameraRef.current) {
      hasInitialCameraRef.current = true;
      isFollowingRef.current = true;
      // Pin the marker's stable coordinate (never updated again; animation drives movement)
      setMarkerCoord(newCoord);
      setLocationHistory([newCoord]);
      mapRef.current?.animateCamera({ center: newCoord, zoom: 18 }, { duration: 0 });
      prevLocationRef.current = newCoord;
      setSpeed(location.speed > 0 ? location.speed : 0);
      setAccuracy(location.accuracy ?? null);
      showStatusPopup(
        'success',
        'Marker ready',
        `GPS accuracy ${Math.round(location.accuracy ?? 0)}m. Start moving to see the marker slide.`
      );
      return;
    }

    // ── Subsequent updates ─────────────────────────────────────────────────────
    setAccuracy(location.accuracy ?? null);
    const dist = prev ? getDistance(prev.latitude, prev.longitude, newCoord.latitude, newCoord.longitude) : 0;

    // Update heading: prefer live GPS heading (device compass), fall back to calculated bearing
    const gpsHeading = typeof location.heading === 'number' && location.heading >= 0
      ? location.heading
      : null;
    const newHeading = gpsHeading ?? (prev && dist >= MIN_MOVE_METERS
      ? getBearing(prev.latitude, prev.longitude, newCoord.latitude, newCoord.longitude)
      : heading);

    if (newHeading !== heading) {
      setHeading(newHeading);
      // Briefly enable tracksViewChanges so the native marker re-renders the rotated arrow
      setTracksViewChanges(true);
      if (tracksTimerRef.current) clearTimeout(tracksTimerRef.current);
      tracksTimerRef.current = setTimeout(() => setTracksViewChanges(false), 200);
    }

    if (dist >= MIN_MOVE_METERS) {
      setLocationHistory(h => [...h.slice(-(MAX_TRAIL_POINTS - 1)), newCoord]);
      if (!hasShownMovementRef.current) {
        hasShownMovementRef.current = true;
        showStatusPopup('success', 'Movement detected', 'Marker is moving with your live location.');
      }
    }

    setSpeed(location.speed > 0 ? location.speed : 0);
    prevLocationRef.current = newCoord;
    setMarkerCoord(newCoord);

    // Smooth camera follow
    if (isFollowingRef.current) {
      mapRef.current?.animateCamera({ center: newCoord, zoom: 18 }, { duration: 800 });
    }
  }, [location]);

  // Nearest geofence calculation
  useEffect(() => {
    if (!location || geofences.length === 0) return;

    let nearest = null;
    let minDist = Infinity;

    geofences.forEach(g => {
      const d = getDistance(
        location.latitude, location.longitude,
        g.center.coordinates[1], g.center.coordinates[0]
      );
      if (d < minDist) {
        minDist = d;
        nearest = { ...g, distance: d, isInside: d <= g.radius };
      }
    });

    setNearestGeofence(nearest);
    setDistance(minDist);
  }, [location, geofences]);

  const loadGeofences = async () => {
    setGeofencesLoading(true);
    try {
      const response = await withTimeout(
        geofenceAPI.getAll({ isActive: true }),
        8000,
        'Geofence loading timed out'
      );
      const zones = normalizeGeofenceList(response);
      setGeofences(zones);
      if (zones.length === 0) {
        showStatusPopup('warning', 'No zones found', 'Ask admin to create office geofences.');
        Alert.alert('No Office Locations', 'Please contact admin to set up office locations.');
      } else {
        showStatusPopup('success', 'Zones loaded', `${zones.length} geofence${zones.length === 1 ? '' : 's'} ready.`);
      }
    } catch (e) {
      console.warn('Failed to load geofences:', e?.message);
      setGeofences([]);
      showStatusPopup('error', 'Zone loading failed', e?.message || 'Failed to load office locations.', true);
      Alert.alert('Error', e?.message || 'Failed to load office locations');
    } finally {
      setGeofencesLoading(false);
    }
  };

  const recenter = useCallback(() => {
    if (!location) return;
    isFollowingRef.current = true;
    mapRef.current?.animateCamera(
      { center: { latitude: location.latitude, longitude: location.longitude }, zoom: 18 },
      { duration: 600 }
    );
  }, [location]);

  const isInside = nearestGeofence?.isInside;
  const speedKmh = Math.round((speed || 0) * 3.6);
  const statusMeta = STATUS_META[statusPopup?.type] || STATUS_META.info;
  const activeMapType = Platform.OS === 'android' && useOsmFallback ? 'none' : 'standard';

  return (
    <View style={styles.container}>
      {/* Map renders immediately with last known position or fallback */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={false}
        mapType={activeMapType}
        loadingEnabled={false}
        loadingIndicatorColor="#6366f1"
        loadingBackgroundColor="#f8fafc"
        initialRegion={DEFAULT_REGION}
        onMapReady={onMapReady}
        onMapLoaded={onMapLoaded}
        onPanDrag={() => { isFollowingRef.current = false; }}
      >
        {useOsmFallback && (
          <UrlTile
            urlTemplate={OSM_TILE_URL}
            maximumZ={19}
            zIndex={-1}
          />
        )}

        {/* Walking trail */}
        {locationHistory.length > 1 && (
          <Polyline
            coordinates={locationHistory}
            strokeColor="#6366f1"
            strokeWidth={5}
            strokeColors={locationHistory.map((_, i) =>
              `rgba(99,102,241,${0.3 + 0.7 * (i / locationHistory.length)})`
            )}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Geofence circles + building markers */}
        {location && geofences.map((g) => {
          const lat = g.center.coordinates[1];
          const lon = g.center.coordinates[0];
          const dist = getDistance(location.latitude, location.longitude, lat, lon);
          const inside = dist <= g.radius;
          return (
            <React.Fragment key={g._id}>
              <Circle
                center={{ latitude: lat, longitude: lon }}
                radius={g.radius}
                fillColor={inside ? 'rgba(16,185,129,0.18)' : 'rgba(99,102,241,0.12)'}
                strokeColor={inside ? '#10b981' : '#6366f1'}
                strokeWidth={inside ? 3 : 2}
              />
              <Marker
                coordinate={{ latitude: lat, longitude: lon }}
                title={g.name}
                description={`${inside ? 'You are inside' : dist.toFixed(0) + 'm away'} · Radius ${g.radius}m`}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.buildingMarker, { backgroundColor: inside ? '#10b981' : '#6366f1' }]}>
                  <Ionicons name="business" size={20} color="#fff" />
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Dashed line to nearest geofence when outside */}
        {location && nearestGeofence && !isInside && (
          <Polyline
            coordinates={[
              { latitude: location.latitude, longitude: location.longitude },
              {
                latitude: nearestGeofence.center.coordinates[1],
                longitude: nearestGeofence.center.coordinates[0],
              },
            ]}
            strokeColor="#ef4444"
            strokeWidth={2}
            lineDashPattern={[12, 8]}
          />
        )}

        {/* GPS accuracy circle — shows how precise the fix is */}
        {location && accuracy !== null && accuracy < 200 && (
          <Circle
            center={{ latitude: location.latitude, longitude: location.longitude }}
            radius={Math.max(accuracy, 8)}
            fillColor="rgba(99,102,241,0.10)"
            strokeColor="rgba(99,102,241,0.35)"
            strokeWidth={1}
          />
        )}

        {/* Zomato-style animated navigation marker */}
        {markerCoord && (
          <Marker
            ref={markerRef}
            coordinate={markerCoord}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={heading}
            tracksViewChanges={tracksViewChanges}
            zIndex={10}
          >
            <View style={styles.youMarkerOuter}>
              <View style={styles.youMarkerInner}>
                <Ionicons name="navigate" size={18} color="#fff" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Small overlay while geofences load — doesn't block map */}
      {geofencesLoading && (
        <View style={styles.geofenceLoader}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.geofenceLoaderText}>Loading zones…</Text>
        </View>
      )}

      {statusPopup && (
        <View style={[
          styles.statusPopup,
          {
            backgroundColor: statusMeta.backgroundColor,
            top: geofencesLoading ? 162 : 112,
          },
        ]}>
          <Ionicons name={statusMeta.icon} size={18} color={statusMeta.color} />
          <View style={styles.statusPopupText}>
            <Text style={[styles.statusPopupTitle, { color: statusMeta.color }]} numberOfLines={1}>
              {statusPopup.title}
            </Text>
            <Text style={styles.statusPopupMessage} numberOfLines={2}>
              {statusPopup.message}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setStatusPopup(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color={statusMeta.color} />
          </TouchableOpacity>
        </View>
      )}

      {/* Pulsing live-dot overlay (center of screen, shows tracking is active) */}
      {!markerCoord && (
        <View style={styles.pulseDotContainer} pointerEvents="none">
          <Animated.View style={[styles.pulseDotRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.pulseDot} />
        </View>
      )}

      {/* Top header strip */}
      <View style={[styles.header, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Live Location</Text>
        <View style={styles.headerPills}>
          <View style={[styles.pill, { backgroundColor: isMapReady ? '#dbeafe' : '#f3f4f6' }]}>
            <Ionicons
              name={useOsmFallback ? 'map-outline' : isMapReady ? 'map' : 'hourglass'}
              size={14}
              color={useOsmFallback ? '#d97706' : isMapReady ? '#2563eb' : '#6b7280'}
            />
            <Text style={[styles.pillText, { color: useOsmFallback ? '#d97706' : isMapReady ? '#2563eb' : '#6b7280' }]}>
              {useOsmFallback ? 'Fallback map' : mapTilesLoaded ? 'Tiles loaded' : isMapReady ? 'Map ready' : 'Map loading'}
            </Text>
          </View>
          {markerCoord && (
            <View style={[styles.pill, { backgroundColor: '#eef2ff' }]}>
              <Ionicons name="navigate" size={14} color="#4f46e5" />
              <Text style={[styles.pillText, { color: '#4f46e5' }]}>
                {accuracy !== null ? `GPS ${Math.round(accuracy)}m` : 'GPS live'}
              </Text>
            </View>
          )}
          {locationHistory.length > 1 && (
            <View style={[styles.pill, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="git-branch" size={14} color="#7c3aed" />
              <Text style={[styles.pillText, { color: '#7c3aed' }]}>
                Trail {locationHistory.length}
              </Text>
            </View>
          )}
          {nearestGeofence && (
            <View style={[styles.pill, { backgroundColor: isInside ? '#dcfce7' : '#fee2e2' }]}>
              <Ionicons
                name={isInside ? 'checkmark-circle' : 'close-circle'}
                size={14}
                color={isInside ? '#16a34a' : '#dc2626'}
              />
              <Text style={[styles.pillText, { color: isInside ? '#16a34a' : '#dc2626' }]}>
                {isInside ? 'Inside zone' : `${Math.round(distance ?? 0)}m away`}
              </Text>
            </View>
          )}
          {/* Google Activity Recognition badge */}
          {walkingState !== 'UNKNOWN' && (
            <View style={[styles.pill, {
              backgroundColor: walkingState === 'WALKING' || walkingState === 'RUNNING' || walkingState === 'ON_FOOT'
                ? '#dbeafe' : '#f3f4f6'
            }]}>
              <Ionicons
                name={
                  walkingState === 'WALKING' || walkingState === 'ON_FOOT' ? 'walk' :
                  walkingState === 'RUNNING' ? 'fitness' :
                  walkingState === 'IN_VEHICLE' ? 'car' :
                  walkingState === 'ON_BICYCLE' ? 'bicycle' : 'pause-circle'
                }
                size={14}
                color={walkingState === 'STILL' ? '#9ca3af' : '#2563eb'}
              />
              <Text style={[styles.pillText, {
                color: walkingState === 'STILL' ? '#9ca3af' : '#2563eb'
              }]}>
                {walkingState === 'WALKING' ? 'Walking' :
                 walkingState === 'RUNNING' ? 'Running' :
                 walkingState === 'ON_FOOT' ? 'On foot' :
                 walkingState === 'IN_VEHICLE' ? 'In vehicle' :
                 walkingState === 'ON_BICYCLE' ? 'Cycling' : 'Stationary'}
              </Text>
            </View>
          )}
          {speedKmh > 1 && (
            <View style={[styles.pill, { backgroundColor: '#ede9fe' }]}>
              <Ionicons name="speedometer" size={14} color="#7c3aed" />
              <Text style={[styles.pillText, { color: '#7c3aed' }]}>{speedKmh} km/h</Text>
            </View>
          )}
        </View>
      </View>

      {/* Re-center button */}
      <TouchableOpacity style={[styles.recenterBtn, { backgroundColor: theme.colors.card }]} onPress={recenter}>
        <Ionicons name="locate" size={22} color={theme.colors.primary} />
      </TouchableOpacity>

      {/* Refresh button */}
      <TouchableOpacity
        style={[styles.refreshBtn, { backgroundColor: theme.colors.primary }]}
        onPress={async () => {
          showStatusPopup('info', 'Refreshing map', 'Updating GPS and geofence zones.');
          await getCurrentLocation();
          await loadGeofences();
        }}
      >
        <Ionicons name="refresh" size={22} color="#fff" />
      </TouchableOpacity>

      {/* Bottom distance card */}
      {nearestGeofence && distance !== null && showDetails && (
        <View style={styles.bottomPanel}>
          <Card style={[styles.card, {
            borderLeftWidth: 4,
            borderLeftColor: isInside ? '#10b981' : '#ef4444',
            backgroundColor: theme.dark ? 'rgba(17,24,39,0.97)' : 'rgba(255,255,255,0.97)',
          }]}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowDetails(false)}>
              <Ionicons name="close-circle" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.statusRow}>
              <Ionicons
                name={isInside ? 'checkmark-circle' : 'close-circle'}
                size={30}
                color={isInside ? '#10b981' : '#ef4444'}
              />
              <View style={styles.statusText}>
                <Text style={[styles.distanceText, { color: isInside ? '#10b981' : '#ef4444' }]}>
                  {distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`}
                </Text>
                <Text style={[styles.statusLabel, { color: isInside ? '#10b981' : '#ef4444' }]}>
                  {isInside ? `INSIDE — ${nearestGeofence.name}` : 'OUTSIDE — Too Far'}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.detailsRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Location</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]} numberOfLines={1}>
                {nearestGeofence.name}
              </Text>
            </View>
            <View style={styles.detailsRow}>
              <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Allowed radius</Text>
              <Text style={[styles.detailValue, { color: theme.colors.text }]}>{nearestGeofence.radius} m</Text>
            </View>
            {!isInside && (
              <View style={styles.detailsRow}>
                <Text style={[styles.detailLabel, { color: '#ef4444' }]}>Move closer by</Text>
                <Text style={[styles.detailValue, { color: '#ef4444', fontWeight: '700' }]}>
                  {Math.round(distance - nearestGeofence.radius)} m
                </Text>
              </View>
            )}
            {locationHistory.length > 1 && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.detailsRow}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>Trail points</Text>
                  <Text style={[styles.detailValue, { color: '#6366f1' }]}>{locationHistory.length} recorded</Text>
                </View>
              </>
            )}
          </Card>
        </View>
      )}

      {!showDetails && nearestGeofence && (
        <TouchableOpacity
          style={[styles.toggleBtn, { backgroundColor: theme.colors.primary }]}
          onPress={() => setShowDetails(true)}
        >
          <Ionicons name="information-circle" size={22} color="#fff" />
          <Text style={styles.toggleBtnText}>
            {isInside ? 'Inside zone' : Math.round(distance) + 'm away'}
          </Text>
        </TouchableOpacity>
      )}

      {useOsmFallback && (
        <View style={styles.mapAttribution} pointerEvents="none">
          <Text style={styles.mapAttributionText}>OpenStreetMap fallback</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingHorizontal: 16,
    paddingBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Custom person/navigation marker
  youMarkerOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99,102,241,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youMarkerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 6,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },

  buildingMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },

  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: 200,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  refreshBtn: {
    position: 'absolute',
    right: 16,
    bottom: 260,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
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
  card: { padding: 16 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  statusText: { flex: 1 },
  distanceText: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  divider: { height: 1, marginVertical: 10 },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  detailLabel: { fontSize: 13, fontWeight: '500' },
  detailValue: { fontSize: 13, fontWeight: '600' },
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
  geofenceLoader: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  geofenceLoaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
  },
  mapAttribution: {
    position: 'absolute',
    left: 10,
    bottom: 110,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapAttributionText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  statusPopup: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
  },
  statusPopupText: {
    flex: 1,
  },
  statusPopupTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  statusPopupMessage: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: '#374151',
  },

  // Pulsing live-location dot (center of screen, camera always follows user)
  pulseDotContainer: {
    position: 'absolute',
    // Centered in the map area below the header
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(99,102,241,0.22)',
  },
  pulseDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6366f1',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
});
