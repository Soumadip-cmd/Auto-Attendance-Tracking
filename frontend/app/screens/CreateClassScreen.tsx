import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function CreateClassScreen({ navigation }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [radius, setRadius] = useState('50');
  const [location, setLocation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
      Alert.alert('Success', 'Current location set as geofence center');
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    } finally {
      setGettingLocation(false);
    }
  };

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleCreate = async () => {
    if (!name || !time || selectedDays.length === 0 || !location || !radius) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      Alert.alert('Error', 'Time must be in HH:MM format (e.g., 14:30)');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/class/create', {
        name,
        schedule_time: time,
        schedule_days: selectedDays,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        radius: parseFloat(radius),
      });

      Alert.alert('Success', 'Class created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="book-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Computer Science 101"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class Time (HH:MM)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="time-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 14:30"
                value={time}
                onChangeText={setTime}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Days of Week</Text>
            <View style={styles.daysContainer}>
              {DAYS.map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    selectedDays.includes(day) && styles.dayButtonActive,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      selectedDays.includes(day) && styles.dayButtonTextActive,
                    ]}
                  >
                    {day.substring(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Geofence Radius (meters)</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="locate-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 50"
                value={radius}
                onChangeText={setRadius}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Geofence Location</Text>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={getCurrentLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="navigate" size={20} color="#fff" />
                  <Text style={styles.locationButtonText}>
                    {location ? 'Location Set ✓' : 'Get Current Location'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {location && (
              <Text style={styles.locationInfo}>
                Lat: {location.coords.latitude.toFixed(6)}, Lng:{' '}
                {location.coords.longitude.toFixed(6)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.createButtonText}>Create Class</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayButtonActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  dayButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  locationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  locationInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
