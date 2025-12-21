import { useState, useEffect } from 'react';
import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  MapPin, 
  Save, 
  X, 
  Building2,
  Navigation,
  Loader2
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { StatsCardSkeleton } from '../components/common/Skeleton';

// Fix Leaflet default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultCenter = [22.5726, 88.3639]; // Kolkata, India

const GEOFENCE_COLORS = [
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Green', value: '#10b981' },
  { label: 'Red', value: '#ef4444' },
  { label: 'Purple', value: '#8b5cf6' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Pink', value: '#ec4899' },
];

const GEOFENCE_TYPES = ['office', 'branch', 'site', 'custom'];

// Map Click Handler Component
function MapClickHandler({ onClick }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng);
    },
  });
  return null;
}

// Map Center Controller Component
function MapCenterController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
}

export default function Geofences() {
  const { setPageTitle } = useOutletContext();
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [clickedLocation, setClickedLocation] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    latitude: '',
    longitude: '',
    radius: 100,
    type: 'office',
    color: '#3b82f6',
    isActive: true,
    enableWorkingHours: false,
    startTime: '09:00',
    endTime: '18:00',
    gracePeriod: 15
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    offices: 0
  });

  useEffect(() => {
    setPageTitle('Geofence Management');
    fetchGeofences();
    getCurrentLocation();
  }, [setPageTitle]);

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCenter = [position.coords.latitude, position.coords.longitude];
          setMapCenter(newCenter);
          toast.success('Location updated!');
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Could not get your location');
          setGettingLocation(false);
        }
      );
    } else {
      toast.error('Geolocation is not supported by your browser');
      setGettingLocation(false);
    }
  };

  const fetchGeofences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/geofences');
      if (response.data.success) {
        const geofenceList = response.data.data;
        setGeofences(geofenceList);
        
        // Calculate stats
        const active = geofenceList.filter(g => g.isActive).length;
        const offices = geofenceList.filter(g => g.type === 'office').length;
        
        setStats({
          total: geofenceList.length,
          active: active,
          inactive: geofenceList.length - active,
          offices: offices
        });
      }
    } catch (error) {
      console.error('Error fetching geofences:', error);
      toast.error('Failed to load geofences');
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (latlng) => {
    const lat = latlng.lat;
    const lng = latlng.lng;
    
    setClickedLocation([lat, lng]);
    setFormData(prev => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6)
    }));
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius),
        type: formData.type,
        color: formData.color,
        isActive: formData.isActive,
        workingHours: formData.enableWorkingHours ? {
          enabled: true,
          startTime: formData.startTime,
          endTime: formData.endTime,
          gracePeriod: parseInt(formData.gracePeriod)
        } : {
          enabled: false
        }
      };

      console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

      if (editingGeofence) {
        await api.put(`/geofences/${editingGeofence._id}`, payload);
        toast.success('Geofence updated successfully!');
      } else {
        await api.post('/geofences', payload);
        toast.success('Geofence created successfully!');
      }

      await fetchGeofences();
      resetForm();
    } catch (error) {
      console.error('❌ Error saving geofence:', error);
      console.error('Response data:', error.response?.data);
      const errorMsg = error.response?.data?.message || 'Failed to save geofence';
      const errors = error.response?.data?.errors;
      
      if (errors && Array.isArray(errors)) {
        console.error('Validation errors:', errors);
        toast.error(`${errorMsg}: ${errors.map(e => e.message).join(', ')}`);
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;

    try {
      await api.delete(`/geofences/${id}`);
      toast.success('Geofence deleted successfully!');
      await fetchGeofences();
    } catch (error) {
      console.error('Error deleting geofence:', error);
      toast.error(error.response?.data?.message || 'Failed to delete geofence');
    }
  };

  const handleEdit = (geofence) => {
    setEditingGeofence(geofence);
    setFormData({
      name: geofence.name,
      description: geofence.description || '',
      latitude: geofence.center.coordinates[1].toString(),
      longitude: geofence.center.coordinates[0].toString(),
      radius: geofence.radius,
      type: geofence.type,
      color: geofence.color,
      isActive: geofence.isActive,
      enableWorkingHours: geofence.workingHours?.enabled || false,
      startTime: geofence.workingHours?.startTime || '09:00',
      endTime: geofence.workingHours?.endTime || '18:00',
      gracePeriod: geofence.workingHours?.gracePeriod || 15
    });
    setClickedLocation([
      geofence.center.coordinates[1],
      geofence.center.coordinates[0]
    ]);
    setMapCenter([
      geofence.center.coordinates[1],
      geofence.center.coordinates[0]
    ]);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      latitude: '',
      longitude: '',
      radius: 100,
      type: 'office',
      color: '#3b82f6',
      isActive: true,
      enableWorkingHours: false,
      startTime: '09:00',
      endTime: '18:00',
      gracePeriod: 15
    });
    setEditingGeofence(null);
    setClickedLocation(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <StatsCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Geofences</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <MapPin className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.active}</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400 mt-1">{stats.inactive}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <Building2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Office Locations</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.offices}</p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Map View</h2>
              <div className="flex gap-2">
                <button
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="btn-secondary flex items-center gap-2"
                >
                  {gettingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  My Location
                </button>
                <button
                  onClick={() => setShowForm(!showForm)}
                  className="btn-primary flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Geofence
                </button>
              </div>
            </div>

            <div style={{ height: '600px', borderRadius: '0.5rem', overflow: 'hidden' }}>
              <MapContainer 
                center={mapCenter} 
                zoom={13} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <MapClickHandler onClick={handleMapClick} />
                <MapCenterController center={mapCenter} />

                {/* Existing Geofences */}
                {geofences.map((geofence) => {
                  const position = [geofence.center.coordinates[1], geofence.center.coordinates[0]];
                  return (
                    <React.Fragment key={geofence._id}>
                      <Circle
                        center={position}
                        radius={geofence.radius}
                        pathOptions={{
                          fillColor: geofence.color,
                          fillOpacity: 0.2,
                          color: geofence.color,
                          weight: 2
                        }}
                      />
                      <Marker position={position}>
                        <Popup>
                          <div className="p-2">
                            <h3 className="font-semibold text-lg">{geofence.name}</h3>
                            <p className="text-sm text-gray-600">{geofence.description || 'No description'}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Radius: {geofence.radius}m | Type: {geofence.type}
                            </p>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleEdit(geofence)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(geofence._id)}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    </React.Fragment>
                  );
                })}

                {/* New Location Marker */}
                {clickedLocation && (
                  <Marker position={clickedLocation} />
                )}
              </MapContainer>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                💡 <strong>Tip:</strong> Click anywhere on the map to create a new geofence at that location, or use "My Location" button to center the map on your current position.
              </p>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div>
          {showForm ? (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingGeofence ? 'Edit Geofence' : 'New Geofence'}
                </h2>
                <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Main Office"
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows="2"
                    placeholder="Headquarters location"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="label mb-0">Coordinates *</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          setGettingLocation(true);
                          navigator.geolocation.getCurrentPosition(
                            (position) => {
                              const lat = position.coords.latitude;
                              const lng = position.coords.longitude;
                              
                              console.log('🌍 YOUR EXACT LOCATION:');
                              console.log('Latitude:', lat);
                              console.log('Longitude:', lng);
                              console.log('Accuracy:', position.coords.accuracy, 'meters');
                              
                              setFormData(prev => ({
                                ...prev,
                                latitude: lat.toString(),
                                longitude: lng.toString()
                              }));
                              setClickedLocation([lat, lng]);
                              setMapCenter([lat, lng]);
                              toast.success(`Location captured! Accuracy: ±${Math.round(position.coords.accuracy)}m`);
                              setGettingLocation(false);
                            },
                            (error) => {
                              console.error('❌ Geolocation Error:', error);
                              toast.error('Could not get your location. Check browser permissions.');
                              setGettingLocation(false);
                            },
                            {
                              enableHighAccuracy: true,
                              timeout: 10000,
                              maximumAge: 0
                            }
                          );
                        } else {
                          toast.error('Geolocation not supported');
                        }
                      }}
                      disabled={gettingLocation}
                      className="btn-secondary text-xs py-1 px-2 flex items-center gap-1"
                    >
                      {gettingLocation ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Navigation className="w-3 h-3" />
                      )}
                      Use Current Location
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label text-xs text-gray-500 dark:text-gray-400">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        className="input"
                        placeholder="28.6139"
                      />
                    </div>
                    <div>
                      <label className="label text-xs text-gray-500 dark:text-gray-400">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        className="input"
                        placeholder="77.2090"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Radius (meters) *</label>
                  <input
                    type="number"
                    required
                    min="10"
                    max="10000"
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="input"
                  >
                    {GEOFENCE_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Color</label>
                  <div className="grid grid-cols-3 gap-2">
                    {GEOFENCE_COLORS.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          formData.color === color.value 
                            ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-gray-900 dark:ring-white' 
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color.value }}
                      >
                        <span className="text-white text-xs font-medium">{color.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>

                {/* Working Hours Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      checked={formData.enableWorkingHours}
                      onChange={(e) => setFormData({ ...formData, enableWorkingHours: e.target.checked })}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable Working Hours
                    </label>
                  </div>

                  {formData.enableWorkingHours && (
                    <div className="space-y-3 pl-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label text-xs">Start Time *</label>
                          <input
                            type="time"
                            required={formData.enableWorkingHours}
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label text-xs">End Time *</label>
                          <input
                            type="time"
                            required={formData.enableWorkingHours}
                            value={formData.endTime}
                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                            className="input"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label text-xs">Grace Period (minutes)</label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={formData.gracePeriod}
                          onChange={(e) => setFormData({ ...formData, gracePeriod: e.target.value })}
                          className="input"
                          placeholder="15"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Staff can check in/out {formData.gracePeriod} minutes before/after working hours
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingGeofence ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Geofence List</h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-600 dark:text-primary-400" />
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Loading geofences...</p>
                </div>
              ) : geofences.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No geofences created yet</p>
                  <p className="text-sm mt-1">Click on the map to create one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {geofences.map((geofence) => (
                    <div
                      key={geofence._id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow bg-white dark:bg-gray-800"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: geofence.color }}
                            />
                            <h3 className="font-semibold text-gray-900 dark:text-white">{geofence.name}</h3>
                            {!geofence.isActive && (
                              <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {geofence.description || 'No description'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                            {geofence.radius}m radius • {geofence.type}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(geofence)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(geofence._id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
