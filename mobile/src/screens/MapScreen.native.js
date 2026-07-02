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
  ScrollView,
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

const DEFAULT_REGION = { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 10, longitudeDelta: 10 };

const { width } = Dimensions.get('window');
const MAX_TRAIL_POINTS = 120;
const MIN_MOVE_METERS = 1;
const MAP_TILE_TIMEOUT_MS = 20000;
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const STATUS_META = {
  info:    { icon: 'information-circle', color: '#4f46e5', bg: '#eef2ff' },
  success: { icon: 'checkmark-circle',   color: '#16a34a', bg: '#f0fdf4' },
  warning: { icon: 'warning',            color: '#b45309', bg: '#fffbeb' },
  error:   { icon: 'alert-circle',       color: '#dc2626', bg: '#fef2f2' },
};

const withTimeout = (promise, ms, message = 'Request timed out') =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ]);

const normalizeGeofenceList = (response) => {
  const list = response?.data?.data || response?.data || response?.geofences || [];
  return Array.isArray(list)
    ? list.filter(
        (g) =>
          g?.center?.coordinates?.length === 2 &&
          Number.isFinite(Number(g.center.coordinates[0])) &&
          Number.isFinite(Number(g.center.coordinates[1]))
      )
    : [];
};

const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
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
  const hasInitialCameraRef = useRef(false);

  const [geofences, setGeofences] = useState([]);
  const [geofencesLoading, setGeofencesLoading] = useState(false);
  const [statusPopup, setStatusPopup] = useState(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapTilesLoaded, setMapTilesLoaded] = useState(false);
  const [useOsmFallback, setUseOsmFallback] = useState(false);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [distance, setDistance] = useState(null);
  const [nearestGeofence, setNearestGeofence] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [locationHistory, setLocationHistory] = useState([]);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [accuracy, setAccuracy] = useState(null);
  const [walkingState, setWalkingState] = useState('UNKNOWN');
  const [markerCoord, setMarkerCoord] = useState(null);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const tracksTimerRef = useRef(null);
  const statusTimerRef = useRef(null);
  const mapTileTimerRef = useRef(null);
  const hasShownMovementRef = useRef(false);
  const mountedAtRef = useRef(Date.now());
  const mapLoadedAtRef = useRef(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const showStatusPopup = useCallback((type, title, message, persistent = false) => {
    if (statusTimerRef.current) {
      clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    setStatusPopup({ type, title, message });
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }).start();
    if (!persistent) {
      statusTimerRef.current = setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() =>
          setStatusPopup(null)
        );
        statusTimerRef.current = null;
      }, 3500);
    }
  }, [toastAnim]);

  const dismissPopup = useCallback(() => {
    if (statusTimerRef.current) { clearTimeout(statusTimerRef.current); statusTimerRef.current = null; }
    Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
      setStatusPopup(null)
    );
  }, [toastAnim]);

  const initializeLiveMap = useCallback(async () => {
    try {
      showStatusPopup('info', 'Starting', 'Getting GPS and live movement ready.');
      const permission = hasPermission ? { foreground: true } : await requestPermissions();
      if (!permission?.foreground) {
        showStatusPopup('error', 'Location blocked', 'Allow location permission to see your position.', true);
        Alert.alert('Location Permission', 'Allow location permission to show live movement.');
        return;
      }
      await getCurrentLocation();
      await startTracking();
      showStatusPopup('success', 'Live tracking active', 'Marker will follow your position.');
      TeacherLiveTrackingService.startTracking().catch((err) => {
        console.warn('Live tracking stream could not start:', err?.message);
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

  const onMapReady = useCallback(async () => {
    try {
      setIsMapReady(true);
      let pos = await Location.getLastKnownPositionAsync({}).catch(() => null);
      if (!pos) {
        pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      }
      if (pos && mapRef.current) {
        const coord = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        isFollowingRef.current = true;
        mapRef.current.animateCamera({ center: coord, zoom: 18 }, { duration: 400 });
      }
    } catch (error) {
      setIsMapReady(true);
    }
  }, []);

  const onMapLoaded = useCallback(() => {
    setMapTilesLoaded(true);
    mapLoadedAtRef.current = Date.now();
    // Don't cancel the OSM timer here — on Android, onMapLoaded fires when
    // the SDK initialises, NOT when tiles actually render. We cancel only
    // if the SDK came up fast enough that tiles are presumably rendering.
    const elapsed = Date.now() - mountedAtRef.current;
    if (elapsed < 8000 && mapTileTimerRef.current) {
      clearTimeout(mapTileTimerRef.current);
      mapTileTimerRef.current = null;
      showStatusPopup('success', 'Google Maps loaded', 'Map tiles are ready.');
    }
  }, [showStatusPopup]);

  useEffect(() => {
    mountedAtRef.current = Date.now();

    // Start the OSM fallback timer from mount. onMapLoaded (which fires when
    // the Google Maps SDK initialises, not when tiles render) will cancel this
    // only if it fires within 8 s — i.e. Google Maps authenticated quickly.
    mapTileTimerRef.current = setTimeout(() => {
      mapTileTimerRef.current = null;
      setUseOsmFallback(true);
      showStatusPopup(
        'warning',
        'Using OpenStreetMap',
        'Google Maps tiles unavailable. Register your SHA-1 in Google Cloud Console.',
        true
      );
    }, MAP_TILE_TIMEOUT_MS);

    initializeLiveMap();
    loadGeofences();
    startActivityDetection();
    return () => {
      stopTracking();
      AndroidGeofencing.stopWalkingDetection().catch(() => null);
      if (tracksTimerRef.current) clearTimeout(tracksTimerRef.current);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (mapTileTimerRef.current) clearTimeout(mapTileTimerRef.current);
      hasInitialCameraRef.current = false;
      isFollowingRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (hasPermission) startTracking();
  }, [hasPermission, startTracking]);

  useEffect(() => {
    if (locationError) showStatusPopup('error', 'Location error', locationError, true);
  }, [locationError, showStatusPopup]);

  useEffect(() => {
    const sub = AndroidGeofencing.addWalkingListener((event) => {
      if (event.transition === 'ENTER') setWalkingState(event.activity);
      else if (event.transition === 'EXIT' && event.activity === walkingState) setWalkingState('STILL');
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
            message: 'GeoAttend uses Activity Recognition to detect movement.',
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

  useEffect(() => {
    if (!location) return;
    const newCoord = { latitude: location.latitude, longitude: location.longitude };
    const prev = prevLocationRef.current;

    if (!hasInitialCameraRef.current) {
      hasInitialCameraRef.current = true;
      isFollowingRef.current = true;
      setMarkerCoord(newCoord);
      setLocationHistory([newCoord]);
      mapRef.current?.animateCamera({ center: newCoord, zoom: 18 }, { duration: 0 });
      prevLocationRef.current = newCoord;
      setSpeed(location.speed > 0 ? location.speed : 0);
      setAccuracy(location.accuracy ?? null);
      return;
    }

    setAccuracy(location.accuracy ?? null);
    const dist = prev ? getDistance(prev.latitude, prev.longitude, newCoord.latitude, newCoord.longitude) : 0;

    const gpsHeading = typeof location.heading === 'number' && location.heading >= 0 ? location.heading : null;
    const newHeading = gpsHeading ?? (prev && dist >= MIN_MOVE_METERS
      ? getBearing(prev.latitude, prev.longitude, newCoord.latitude, newCoord.longitude)
      : heading);

    if (newHeading !== heading) {
      setHeading(newHeading);
      setTracksViewChanges(true);
      if (tracksTimerRef.current) clearTimeout(tracksTimerRef.current);
      tracksTimerRef.current = setTimeout(() => setTracksViewChanges(false), 200);
    }

    if (dist >= MIN_MOVE_METERS) {
      setLocationHistory(h => [...h.slice(-(MAX_TRAIL_POINTS - 1)), newCoord]);
      if (!hasShownMovementRef.current) {
        hasShownMovementRef.current = true;
        showStatusPopup('success', 'Movement detected', 'Marker is tracking your live position.');
      }
    }

    setSpeed(location.speed > 0 ? location.speed : 0);
    prevLocationRef.current = newCoord;
    setMarkerCoord(newCoord);

    if (isFollowingRef.current) {
      mapRef.current?.animateCamera({ center: newCoord, zoom: 18 }, { duration: 800 });
    }
  }, [location]);

  useEffect(() => {
    if (!location || geofences.length === 0) return;
    let nearest = null;
    let minDist = Infinity;
    geofences.forEach(g => {
      const d = getDistance(location.latitude, location.longitude, g.center.coordinates[1], g.center.coordinates[0]);
      if (d < minDist) { minDist = d; nearest = { ...g, distance: d, isInside: d <= g.radius }; }
    });
    setNearestGeofence(nearest);
    setDistance(minDist);
  }, [location, geofences]);

  const loadGeofences = async () => {
    setGeofencesLoading(true);
    try {
      const response = await withTimeout(geofenceAPI.getAll({ isActive: true }), 8000, 'Geofence loading timed out');
      const zones = normalizeGeofenceList(response);
      setGeofences(zones);
      if (zones.length === 0) {
        showStatusPopup('warning', 'No zones found', 'Ask admin to create office geofences.');
        Alert.alert('No Office Locations', 'Please contact admin to set up office locations.');
      } else {
        showStatusPopup('success', `${zones.length} zone${zones.length === 1 ? '' : 's'} loaded`, 'Geofence boundaries are active.');
      }
    } catch (e) {
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

  const retryMapTiles = useCallback(() => {
    if (mapTileTimerRef.current) { clearTimeout(mapTileTimerRef.current); mapTileTimerRef.current = null; }
    mountedAtRef.current = Date.now();
    mapLoadedAtRef.current = null;
    setUseOsmFallback(false);
    setMapTilesLoaded(false);
    setIsMapReady(false);
    setMapInstanceKey(k => k + 1);
    // Restart the OSM fallback timer for the new attempt
    mapTileTimerRef.current = setTimeout(() => {
      mapTileTimerRef.current = null;
      setUseOsmFallback(true);
      showStatusPopup(
        'warning',
        'Using OpenStreetMap',
        'Google Maps tiles unavailable. Register your SHA-1 in Google Cloud Console.',
        true
      );
    }, MAP_TILE_TIMEOUT_MS);
    showStatusPopup('info', 'Retrying Google Maps', 'Checking if tiles are available now.');
  }, [showStatusPopup]);

  const isInside = nearestGeofence?.isInside;
  const speedKmh = Math.round((speed || 0) * 3.6);
  const statusMeta = STATUS_META[statusPopup?.type] || STATUS_META.info;
  const activeMapType = Platform.OS === 'android' && useOsmFallback ? 'none' : 'standard';
  const accentColor = isInside ? '#10b981' : '#ef4444';

  // Walking activity helpers
  const activityIcon = walkingState === 'WALKING' || walkingState === 'ON_FOOT' ? 'walk'
    : walkingState === 'RUNNING' ? 'fitness'
    : walkingState === 'IN_VEHICLE' ? 'car'
    : walkingState === 'ON_BICYCLE' ? 'bicycle'
    : 'pause-circle';
  const activityLabel = walkingState === 'WALKING' ? 'Walking'
    : walkingState === 'RUNNING' ? 'Running'
    : walkingState === 'ON_FOOT' ? 'On foot'
    : walkingState === 'IN_VEHICLE' ? 'In vehicle'
    : walkingState === 'ON_BICYCLE' ? 'Cycling'
    : 'Still';

  return (
    <View style={styles.container}>
      {/* ── MAP ─────────────────────────────────────────────────────────── */}
      <MapView
        key={mapInstanceKey}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic={false}
        mapType={activeMapType}
        loadingEnabled={false}
        initialRegion={DEFAULT_REGION}
        onMapReady={onMapReady}
        onMapLoaded={onMapLoaded}
        onPanDrag={() => { isFollowingRef.current = false; }}
      >
        {useOsmFallback && (
          <UrlTile
            urlTemplate={OSM_TILE_URL}
            tileSize={256}
            minimumZ={0}
            maximumZ={19}
            maximumNativeZ={19}
            opacity={1}
            zIndex={100}
          />
        )}

        {locationHistory.length > 1 && (
          <Polyline
            coordinates={locationHistory}
            strokeColor="#6366f1"
            strokeWidth={4}
            strokeColors={locationHistory.map((_, i) =>
              `rgba(99,102,241,${0.25 + 0.75 * (i / locationHistory.length)})`
            )}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {location && geofences.map((g) => {
          const lat = g.center.coordinates[1];
          const lon = g.center.coordinates[0];
          const d = getDistance(location.latitude, location.longitude, lat, lon);
          const inside = d <= g.radius;
          return (
            <React.Fragment key={g._id}>
              <Circle
                center={{ latitude: lat, longitude: lon }}
                radius={g.radius}
                fillColor={inside ? 'rgba(16,185,129,0.14)' : 'rgba(99,102,241,0.10)'}
                strokeColor={inside ? '#10b981' : '#6366f1'}
                strokeWidth={inside ? 2.5 : 1.5}
              />
              <Marker
                coordinate={{ latitude: lat, longitude: lon }}
                title={g.name}
                description={`${inside ? 'You are inside' : d.toFixed(0) + 'm away'} · Radius ${g.radius}m`}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.buildingMarker, { backgroundColor: inside ? '#10b981' : '#6366f1' }]}>
                  <Ionicons name="business" size={18} color="#fff" />
                </View>
              </Marker>
            </React.Fragment>
          );
        })}

        {location && nearestGeofence && !isInside && (
          <Polyline
            coordinates={[
              { latitude: location.latitude, longitude: location.longitude },
              { latitude: nearestGeofence.center.coordinates[1], longitude: nearestGeofence.center.coordinates[0] },
            ]}
            strokeColor="#ef4444"
            strokeWidth={1.5}
            lineDashPattern={[10, 8]}
          />
        )}

        {location && accuracy !== null && accuracy < 200 && (
          <Circle
            center={{ latitude: location.latitude, longitude: location.longitude }}
            radius={Math.max(accuracy, 8)}
            fillColor="rgba(99,102,241,0.08)"
            strokeColor="rgba(99,102,241,0.28)"
            strokeWidth={1}
          />
        )}

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
                <Ionicons name="navigate" size={16} color="#fff" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* ── PULSING DOT (before first GPS fix) ───────────────────────── */}
      {!markerCoord && (
        <View style={styles.pulseDotContainer} pointerEvents="none">
          <Animated.View style={[styles.pulseDotRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.pulseDot} />
        </View>
      )}

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: theme.dark ? 'rgba(15,18,30,0.96)' : 'rgba(255,255,255,0.96)' }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <View style={styles.liveIndicator} />
            <Text style={[styles.title, { color: theme.colors.text }]}>Live Location</Text>
          </View>
          {geofencesLoading && (
            <View style={styles.loadingBadge}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.loadingBadgeText}>Zones…</Text>
            </View>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsScroll}
        >
          {/* Map type pill */}
          <Pill
            icon={useOsmFallback ? 'map-outline' : isMapReady ? 'map' : 'hourglass'}
            label={useOsmFallback ? 'OSM map' : mapTilesLoaded ? 'Google Maps' : isMapReady ? 'Map ready' : 'Loading…'}
            color={useOsmFallback ? '#b45309' : isMapReady ? '#4f46e5' : '#6b7280'}
            bg={useOsmFallback ? '#fef3c7' : isMapReady ? '#eef2ff' : '#f3f4f6'}
          />
          {markerCoord && (
            <Pill
              icon="navigate"
              label={accuracy !== null ? `GPS ${Math.round(accuracy)}m` : 'GPS live'}
              color="#4f46e5"
              bg="#eef2ff"
            />
          )}
          {locationHistory.length > 1 && (
            <Pill
              icon="git-branch"
              label={`Trail ${locationHistory.length}`}
              color="#7c3aed"
              bg="#ede9fe"
            />
          )}
          {nearestGeofence && (
            <Pill
              icon={isInside ? 'checkmark-circle' : 'close-circle'}
              label={isInside ? 'Inside zone' : `${Math.round(distance ?? 0)}m away`}
              color={isInside ? '#16a34a' : '#dc2626'}
              bg={isInside ? '#f0fdf4' : '#fef2f2'}
            />
          )}
          {walkingState !== 'UNKNOWN' && (
            <Pill
              icon={activityIcon}
              label={activityLabel}
              color={walkingState === 'STILL' ? '#9ca3af' : '#2563eb'}
              bg={walkingState === 'STILL' ? '#f3f4f6' : '#dbeafe'}
            />
          )}
          {speedKmh > 1 && (
            <Pill icon="speedometer" label={`${speedKmh} km/h`} color="#7c3aed" bg="#ede9fe" />
          )}
        </ScrollView>
      </View>

      {/* ── STATUS TOAST ─────────────────────────────────────────────── */}
      {statusPopup && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: statusMeta.bg,
              borderLeftColor: statusMeta.color,
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
            },
          ]}
        >
          <Ionicons name={statusMeta.icon} size={17} color={statusMeta.color} style={{ marginTop: 1 }} />
          <View style={styles.toastText}>
            <Text style={[styles.toastTitle, { color: statusMeta.color }]} numberOfLines={1}>
              {statusPopup.title}
            </Text>
            <Text style={styles.toastMessage} numberOfLines={2}>
              {statusPopup.message}
            </Text>
          </View>
          <TouchableOpacity onPress={dismissPopup} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={16} color={statusMeta.color} />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* ── FAB GROUP (right side) ────────────────────────────────────── */}
      <View style={styles.fabGroup}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#6366f1' }]}
          onPress={async () => {
            retryMapTiles();
            await getCurrentLocation();
            await loadGeofences();
          }}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.dark ? '#1e293b' : '#fff' }]}
          onPress={recenter}
        >
          <Ionicons name="locate" size={20} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* ── OSM ATTRIBUTION ──────────────────────────────────────────── */}
      {useOsmFallback && (
        <View style={styles.osmBadge} pointerEvents="none">
          <Ionicons name="map-outline" size={11} color="#92400e" />
          <Text style={styles.osmBadgeText}>OpenStreetMap</Text>
        </View>
      )}

      {/* ── BOTTOM DETAIL CARD ───────────────────────────────────────── */}
      {nearestGeofence && distance !== null && showDetails && (
        <View style={styles.bottomPanel}>
          <View style={[styles.detailCard, { backgroundColor: theme.dark ? '#0f172a' : '#ffffff' }]}>
            {/* Colour bar */}
            <View style={[styles.cardBar, { backgroundColor: accentColor }]} />

            <View style={styles.cardContent}>
              {/* Close */}
              <TouchableOpacity style={styles.cardClose} onPress={() => setShowDetails(false)}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              {/* Primary status */}
              <View style={styles.cardPrimary}>
                <View style={[styles.statusBubble, { backgroundColor: accentColor + '18' }]}>
                  <Ionicons
                    name={isInside ? 'checkmark-circle' : 'close-circle'}
                    size={26}
                    color={accentColor}
                  />
                </View>
                <View style={styles.cardPrimaryText}>
                  <Text style={[styles.distanceNum, { color: accentColor }]}>
                    {distance >= 1000
                      ? `${(distance / 1000).toFixed(2)} km`
                      : `${Math.round(distance)} m`}
                  </Text>
                  <Text style={[styles.statusTag, { color: accentColor }]}>
                    {isInside ? `INSIDE — ${nearestGeofence.name}` : 'OUTSIDE — Move closer'}
                  </Text>
                </View>
              </View>

              {/* Details grid */}
              <View style={[styles.cardDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.cardGrid}>
                <CardRow
                  label="Location"
                  value={nearestGeofence.name}
                  theme={theme}
                />
                <CardRow
                  label="Allowed radius"
                  value={`${nearestGeofence.radius} m`}
                  theme={theme}
                />
                {!isInside && (
                  <CardRow
                    label="Need to move"
                    value={`${Math.round(distance - nearestGeofence.radius)} m closer`}
                    valueColor="#ef4444"
                    theme={theme}
                  />
                )}
                {locationHistory.length > 1 && (
                  <CardRow
                    label="Trail points"
                    value={`${locationHistory.length} recorded`}
                    valueColor="#6366f1"
                    theme={theme}
                  />
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── MINIMISED PILL ───────────────────────────────────────────── */}
      {!showDetails && nearestGeofence && (
        <TouchableOpacity
          style={[styles.miniPill, { backgroundColor: accentColor }]}
          onPress={() => setShowDetails(true)}
        >
          <Ionicons
            name={isInside ? 'checkmark-circle' : 'alert-circle'}
            size={17}
            color="#fff"
          />
          <Text style={styles.miniPillText}>
            {isInside ? `Inside — ${nearestGeofence.name}` : `${Math.round(distance)}m away`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ── Small reusable pill component ─────────────────────────────────── */
function Pill({ icon, label, color, bg }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

/* ── Detail card row ────────────────────────────────────────────────── */
function CardRow({ label, value, theme, valueColor }) {
  return (
    <View style={styles.cardRow}>
      <Text style={[styles.cardRowLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text
        style={[styles.cardRowValue, { color: valueColor || theme.colors.text }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 52 : 44,
    paddingBottom: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  loadingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  loadingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  pillsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Toast ────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: Platform.OS === 'ios' ? 148 : 136,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderLeftWidth: 3,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  toastText: { flex: 1 },
  toastTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  toastMessage: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: '#374151',
  },

  // ── FAB group ────────────────────────────────────────────────────────
  fabGroup: {
    position: 'absolute',
    right: 14,
    bottom: 220,
    gap: 10,
    alignItems: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 4,
  },

  // ── OSM badge ────────────────────────────────────────────────────────
  osmBadge: {
    position: 'absolute',
    left: 10,
    bottom: 206,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,251,235,0.92)',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  osmBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },

  // ── Bottom card ──────────────────────────────────────────────────────
  bottomPanel: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
  },
  detailCard: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  cardBar: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: 16,
  },
  cardClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 2,
  },
  cardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingRight: 28,
  },
  statusBubble: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPrimaryText: { flex: 1 },
  distanceNum: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  statusTag: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
    letterSpacing: 0.2,
  },
  cardDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  cardGrid: {
    gap: 5,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardRowLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  cardRowValue: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '55%',
    textAlign: 'right',
  },

  // ── Minimised pill ───────────────────────────────────────────────────
  miniPill: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  miniPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Navigation marker ────────────────────────────────────────────────
  youMarkerOuter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(99,102,241,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youMarkerInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
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

  // ── Geofence building marker ─────────────────────────────────────────
  buildingMarker: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
  },

  // ── Pulsing dot ──────────────────────────────────────────────────────
  pulseDotContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotRing: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(99,102,241,0.20)',
  },
  pulseDot: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#6366f1',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 4,
  },
});
