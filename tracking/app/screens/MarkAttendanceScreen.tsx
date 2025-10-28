import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

export default function MarkAttendanceScreen({ route, navigation }: any) {
  const { classData } = route.params;
  const { user } = useAuth();
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to mark attendance');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  const markAttendanceGeo = async () => {
    if (!location) {
      Alert.alert('Error', 'Location not available');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/attendance/mark', {
        class_id: classData._id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        method: 'geo',
      });

      Alert.alert(
        'Success',
        response.data.flagged
          ? `Attendance marked but flagged: ${response.data.flag_reason}`
          : 'Attendance marked successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const distance = location
    ? calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        classData.geofence.latitude,
        classData.geofence.longitude
      )
    : null;

  const isInGeofence = distance !== null && distance <= classData.geofence.radius;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.classInfo}>
          <Ionicons name="school" size={32} color="#4F46E5" />
          <View style={styles.classDetails}>
            <Text style={styles.className}>{classData.name}</Text>
            <Text style={styles.teacherName}>By {classData.teacher_name}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <Ionicons name="location" size={24} color="#4F46E5" />
            <Text style={styles.locationTitle}>Your Location Status</Text>
          </View>
          {location ? (
            <>
              <View style={styles.locationStatus}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: isInGeofence ? '#10B981' : '#EF4444' },
                  ]}
                />
                <Text style={styles.locationStatusText}>
                  {isInGeofence
                    ? 'You are inside the class geofence'
                    : `You are ${Math.round(distance!)}m away from class`}
                </Text>
              </View>
              <Text style={styles.locationCoords}>
                Lat: {location.coords.latitude.toFixed(6)}, Lng:{' '}
                {location.coords.longitude.toFixed(6)}
              </Text>
            </>
          ) : (
            <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 16 }} />
          )}
        </View>

        <View style={styles.methodsSection}>
          <Text style={styles.methodsTitle}>Mark Attendance</Text>

          <TouchableOpacity
            style={[
              styles.methodButton,
              (!isInGeofence || loading) && styles.methodButtonDisabled,
            ]}
            onPress={markAttendanceGeo}
            disabled={!isInGeofence || loading}
          >
            <View style={[styles.methodIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="navigate" size={28} color="#2563EB" />
            </View>
            <View style={styles.methodContent}>
              <Text style={styles.methodTitle}>Geo-based Attendance</Text>
              <Text style={styles.methodDescription}>
                Automatic attendance using your location
              </Text>
            </View>
            {loading ? (
              <ActivityIndicator color="#4F46E5" />
            ) : (
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  classDetails: {
    marginLeft: 16,
    flex: 1,
  },
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  teacherName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    padding: 24,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  locationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  locationStatusText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  locationCoords: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  methodsSection: {
    marginTop: 8,
  },
  methodsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  methodButtonDisabled: {
    opacity: 0.5,
  },
  methodIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  methodContent: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scannerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
});
