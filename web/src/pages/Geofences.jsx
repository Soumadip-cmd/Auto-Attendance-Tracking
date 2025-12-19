import { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Power, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const Geofences = () => {
  const [geofences, setGeofences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'campus',
    latitude: '',
    longitude: '',
    radius: 100,
    address: '',
    workingHours: {
      start: '09:00',
      end: '18:00',
    },
    alerts: {
      onEntry: true,
      onExit: true,
    },
    color: '#6366f1',
    isActive: true,
  });

  useEffect(() => {
    fetchGeofences();
  }, []);

  const fetchGeofences = async () => {
    try {
      const response = await api.get('/geofences');
      setGeofences(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch geofences');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare data with proper types matching backend schema
      const geofenceData = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius),
        // Address as object (backend expects object structure)
        address: formData.address ? {
          street: formData.address,
          city: '',
          state: '',
          country: '',
          postalCode: ''
        } : undefined,
        // Working hours matching backend schema
        workingHours: {
          enabled: true,
          schedule: [
            {
              day: 'monday',
              startTime: formData.workingHours.start,
              endTime: formData.workingHours.end
            },
            {
              day: 'tuesday',
              startTime: formData.workingHours.start,
              endTime: formData.workingHours.end
            },
            {
              day: 'wednesday',
              startTime: formData.workingHours.start,
              endTime: formData.workingHours.end
            },
            {
              day: 'thursday',
              startTime: formData.workingHours.start,
              endTime: formData.workingHours.end
            },
            {
              day: 'friday',
              startTime: formData.workingHours.start,
              endTime: formData.workingHours.end
            }
          ]
        },
        // Alerts matching backend schema
        alerts: {
          entryAlert: formData.alerts.onEntry,
          exitAlert: formData.alerts.onExit,
          violationAlert: false,
          notifyManagers: true
        },
        color: formData.color,
        isActive: formData.isActive,
      };

      console.log('Submitting geofence:', geofenceData);

      if (editingGeofence) {
        await api.put(`/geofences/${editingGeofence._id}`, geofenceData);
        toast.success('Geofence updated successfully');
      } else {
        await api.post('/geofences', geofenceData);
        toast.success('Geofence created successfully');
      }
      
      fetchGeofences();
      handleCloseModal();
    } catch (error) {
      console.error('Geofence submit error:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.data?.errors) {
        console.error('Validation errors:', JSON.stringify(error.response.data.errors, null, 2));
      }
      const errorMsg = error.response?.data?.errors?.map(e => `${e.field}: ${e.message}`).join(', ') || 
                       error.response?.data?.message || 
                       'Failed to save geofence';
      toast.error(errorMsg);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this geofence?')) return;
    
    try {
      await api.delete(`/geofences/${id}`);
      toast.success('Geofence deleted successfully');
      fetchGeofences();
    } catch (error) {
      toast.error('Failed to delete geofence');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await api.put(`/geofences/${id}`, { isActive: !isActive });
      toast.success(isActive ? 'Geofence deactivated' : 'Geofence activated');
      fetchGeofences();
    } catch (error) {
      toast.error('Failed to update geofence');
    }
  };

  const handleEdit = (geofence) => {
    setEditingGeofence(geofence);
    setFormData({
      name: geofence.name,
      description: geofence.description || '',
      type: geofence.type,
      latitude: geofence.center.coordinates[1],
      longitude: geofence.center.coordinates[0],
      radius: geofence.radius,
      address: geofence.address || '',
      workingHours: geofence.workingHours || { start: '09:00', end: '18:00' },
      alerts: geofence.alerts || { onEntry: true, onExit: true },
      color: geofence.color || '#6366f1',
      isActive: geofence.isActive !== false,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingGeofence(null);
    setFormData({
      name: '',
      description: '',
      type: 'campus',
      latitude: '',
      longitude: '',
      radius: 100,
      address: '',
      workingHours: { start: '09:00', end: '18:00' },
      alerts: { onEntry: true, onExit: true },
      color: '#6366f1',
      isActive: true,
    });
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          });
          toast.success('Location captured!');
        },
        () => {
          toast.error('Unable to get location');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Geofences</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage virtual boundaries for attendance tracking
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Geofence
        </button>
      </div>

      {/* Geofences Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-primary-600"></div>
        </div>
      ) : geofences.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
          <MapPin className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No geofences configured yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Create your first geofence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {geofences.map((geofence) => (
            <div
              key={geofence._id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${geofence.color}20` }}
                  >
                    <MapPin style={{ color: geofence.color }} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {geofence.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {geofence.type}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(geofence._id, geofence.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      geofence.isActive
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {geofence.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {geofence.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="w-4 h-4" />
                  <span>Radius: {geofence.radius}m</span>
                </div>
                {geofence.workingHours && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      {geofence.workingHours.start} - {geofence.workingHours.end}
                    </span>
                  </div>
                )}
                {geofence.assignedUsers && geofence.assignedUsers.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{geofence.assignedUsers.length} users assigned</span>
                  </div>
                )}
              </div>

              {geofence.address && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {typeof geofence.address === 'string' 
                    ? geofence.address 
                    : `${geofence.address.street || ''}, ${geofence.address.city || ''}, ${geofence.address.state || ''} ${geofence.address.postalCode || ''}, ${geofence.address.country || ''}`.replace(/,\s*,/g, ',').trim()}
                </p>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEdit(geofence)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-primary-600 bg-primary-50 dark:bg-primary-900/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(geofence._id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingGeofence ? 'Edit Geofence' : 'Create Geofence'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows="2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="campus">Campus</option>
                      <option value="building">Building</option>
                      <option value="department">Department</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Location</h3>
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Use Current Location
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.latitude}
                      onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.longitude}
                      onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Radius (meters) *
                  </label>
                  <input
                    type="number"
                    value={formData.radius}
                    onChange={(e) => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="10"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 50-200 meters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Working Hours */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Working Hours</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.workingHours.start}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          workingHours: { ...formData.workingHours, start: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.workingHours.end}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          workingHours: { ...formData.workingHours, end: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Alerts</h3>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.alerts.onEntry}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          alerts: { ...formData.alerts, onEntry: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Alert on entry
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.alerts.onExit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          alerts: { ...formData.alerts, onExit: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Alert on exit
                    </span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingGeofence ? 'Update' : 'Create'} Geofence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Geofences;
