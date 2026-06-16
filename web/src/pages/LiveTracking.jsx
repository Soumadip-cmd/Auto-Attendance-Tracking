import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { io } from 'socket.io-client';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  AlertTriangle,
  Clock,
  Loader2,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Route
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api, { liveTrackingAPI } from '../services/api';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter = [22.5726, 88.3639];

const getSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  const baseUrl = api.defaults.baseURL || 'http://localhost:5000/api/v1';
  return baseUrl.replace(/\/api\/v\d+\/?$/, '');
};

const makeMarkerIcon = (location) => {
  const color = location.violation ? '#dc2626' : location.insideTemporaryPermission ? '#f59e0b' : '#16a34a';
  const pulse = location.violation ? '#fecaca' : '#bbf7d0';

  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        border-radius: 9999px;
        background: ${pulse};
        border: 1px solid rgba(255,255,255,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 20px rgba(15,23,42,0.25);
      ">
        <div style="width: 12px; height: 12px; border-radius: 9999px; background: ${color};"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const formatTeacherName = (location) => {
  const teacher = location.teacher;
  if (!teacher) return 'Unknown teacher';
  return teacher.fullName || `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim() || teacher.email;
};

const formatLastSeen = (dateValue) => {
  if (!dateValue) return 'No signal';
  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  return `${Math.floor(diffMinutes / 60)}h ago`;
};

const isRecentlyLive = (dateValue) => {
  if (!dateValue) return false;
  return Date.now() - new Date(dateValue).getTime() < 3 * 60 * 1000;
};

function MapController({ center, trail }) {
  const map = useMap();

  useEffect(() => {
    if (trail.length > 1) {
      map.fitBounds(trail, { padding: [40, 40], maxZoom: 18 });
      return;
    }

    if (center) {
      map.setView(center, 16);
    }
  }, [center, map, trail]);

  return null;
}

export default function LiveTracking() {
  const { setPageTitle } = useOutletContext();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [trail, setTrail] = useState([]);
  const [trailLoading, setTrailLoading] = useState(false);

  const selectedLocation = useMemo(
    () => locations.find((location) => location.userId === selectedTeacherId) || locations[0],
    [locations, selectedTeacherId]
  );

  const mapCenter = selectedLocation?.latitude && selectedLocation?.longitude
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : defaultCenter;

  const trailPositions = useMemo(
    () => trail.map((point) => [point.latitude, point.longitude]),
    [trail]
  );

  const stats = useMemo(() => {
    const live = locations.filter((location) => isRecentlyLive(location.lastSeenAt)).length;
    const violations = locations.filter((location) => location.violation).length;
    const permissions = locations.filter((location) => location.insideTemporaryPermission).length;

    return {
      live,
      total: locations.length,
      violations,
      permissions
    };
  }, [locations]);

  const upsertLocation = useCallback((nextLocation) => {
    setLocations((current) => {
      const existingIndex = current.findIndex((location) => location.userId === nextLocation.userId);
      if (existingIndex === -1) {
        return [nextLocation, ...current].sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
      }

      const updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...nextLocation
      };
      return updated.sort((a, b) => new Date(b.lastSeenAt) - new Date(a.lastSeenAt));
    });
  }, []);

  const fetchLiveLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await liveTrackingAPI.getLive({ activeWithinMinutes: 180 });
      if (response.data.success) {
        setLocations(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load live locations:', error);
      toast.error(error.response?.data?.message || 'Failed to load live tracking');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrail = useCallback(async (teacherId) => {
    if (!teacherId) return;

    try {
      setTrailLoading(true);
      const response = await liveTrackingAPI.getTeacherTrail(teacherId, {
        limit: 300
      });
      if (response.data.success) {
        setTrail(response.data.data.points || []);
      }
    } catch (error) {
      console.error('Failed to load teacher trail:', error);
      toast.error(error.response?.data?.message || 'Failed to load movement trail');
    } finally {
      setTrailLoading(false);
    }
  }, []);

  const handleSelectTeacher = useCallback((location) => {
    setSelectedTeacherId(location.userId);
    fetchTrail(location.userId);
  }, [fetchTrail]);

  useEffect(() => {
    setPageTitle('Live Teacher Tracking');
    fetchLiveLocations();
  }, [fetchLiveLocations, setPageTitle]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSocketStatus('offline');
      return undefined;
    }

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setSocketStatus('connected');
      socket.emit('subscribe:live-teachers');
    });

    socket.on('disconnect', () => {
      setSocketStatus('offline');
    });

    socket.on('connect_error', (error) => {
      console.warn('Live tracking socket error:', error.message);
      setSocketStatus('offline');
    });

    socket.on('live-location:update', (location) => {
      upsertLocation(location);
      if (location.userId === selectedTeacherId) {
        setTrail((current) => [
          ...current.slice(-299),
          {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: location.speed,
            heading: location.heading,
            violation: location.violation,
            timestamp: location.lastSeenAt
          }
        ]);
      }
    });

    socket.on('live-location:stopped', (data) => {
      setLocations((current) =>
        current.map((location) =>
          location.userId === data.userId
            ? { ...location, trackingStatus: 'offline' }
            : location
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedTeacherId, upsertLocation]);

  useEffect(() => {
    if (!selectedTeacherId && locations.length > 0) {
      setSelectedTeacherId(locations[0].userId);
      fetchTrail(locations[0].userId);
    }
  }, [fetchTrail, locations, selectedTeacherId]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Live teachers</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.live}</p>
            </div>
            <Radio className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tracked today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Navigation className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Violations</p>
              <p className="text-2xl font-bold text-red-600">{stats.violations}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved movement</p>
              <p className="text-2xl font-bold text-amber-600">{stats.permissions}</p>
            </div>
            <Route className="w-6 h-6 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <div className="xl:col-span-3 card p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Movement Map</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedLocation ? formatTeacherName(selectedLocation) : 'No teacher selected'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                socketStatus === 'connected'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {socketStatus === 'connected' ? 'Socket live' : 'Socket offline'}
              </span>
              <button
                onClick={fetchLiveLocations}
                className="btn-secondary flex items-center gap-2"
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Refresh
              </button>
            </div>
          </div>

          <div className="h-[650px]">
            <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapController center={mapCenter} trail={trailPositions} />

              {trailPositions.length > 1 && (
                <Polyline positions={trailPositions} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.75 }} />
              )}

              {locations.map((location) => (
                <Marker
                  key={location.userId}
                  position={[location.latitude, location.longitude]}
                  icon={makeMarkerIcon(location)}
                  eventHandlers={{
                    click: () => handleSelectTeacher(location)
                  }}
                >
                  <Popup>
                    <div className="space-y-1">
                      <p className="font-semibold">{formatTeacherName(location)}</p>
                      <p className="text-xs">Accuracy: {Math.round(location.accuracy || 0)}m</p>
                      <p className="text-xs">Last seen: {formatLastSeen(location.lastSeenAt)}</p>
                      {location.violation && (
                        <p className="text-xs text-red-600">Outside assigned geofence</p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Teachers</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {trailLoading ? 'Loading trail...' : `${trail.length} trail points`}
            </p>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[650px] overflow-y-auto">
            {loading && locations.length === 0 ? (
              <div className="p-6 flex items-center gap-3 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading live locations
              </div>
            ) : locations.length === 0 ? (
              <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
                No live teacher locations found.
              </div>
            ) : (
              locations.map((location) => {
                const selected = location.userId === selectedTeacherId;

                return (
                  <button
                    key={location.userId}
                    onClick={() => handleSelectTeacher(location)}
                    className={`w-full text-left p-4 transition-colors ${
                      selected
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {formatTeacherName(location)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {location.teacher?.department || location.teacher?.email || 'Teacher'}
                        </p>
                      </div>
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 ${
                        location.violation
                          ? 'bg-red-500'
                          : isRecentlyLive(location.lastSeenAt)
                            ? 'bg-green-500'
                            : 'bg-gray-400'
                      }`} />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        <Clock className="w-3 h-3" />
                        {formatLastSeen(location.lastSeenAt)}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        location.violation
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : location.insideTemporaryPermission
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {location.violation
                          ? 'Outside'
                          : location.insideTemporaryPermission
                            ? 'Allowed move'
                            : 'Inside'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
