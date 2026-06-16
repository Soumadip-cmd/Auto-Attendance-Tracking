import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { movementPermissionAPI } from '../src/services/api';
import { useTheme } from '../src/hooks/useTheme';

export default function MovementRequestScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const [radius, setRadius] = useState('100');
  const [durationMinutes, setDurationMinutes] = useState('40');
  const [location, setLocation] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const captureLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location Required', 'Please allow location access to request movement permission.');
      return;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    setLocation({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
      accuracy: current.coords.accuracy,
    });
  };

  const submitRequest = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please enter why you need temporary movement access.');
      return;
    }

    if (!location) {
      await captureLocation();
      return;
    }

    const now = new Date();
    const end = new Date(now.getTime() + Number(durationMinutes || 40) * 60 * 1000);

    try {
      setSubmitting(true);
      await movementPermissionAPI.create({
        reason: reason.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        radius: Number(radius || 100),
        startTime: now.toISOString(),
        endTime: end.toISOString(),
      });

      Alert.alert('Request Sent', 'Your HOD/admin can now approve temporary movement access.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Request Failed', error.message || 'Could not submit movement request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Movement Access</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Request temporary geofence permission
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Reason</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder="Urgent work, department visit, exam duty..."
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, styles.textArea, {
              color: theme.colors.text,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
            }]}
          />

          <View style={styles.row}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Radius meters</Text>
              <TextInput
                value={radius}
                onChangeText={setRadius}
                keyboardType="number-pad"
                style={[styles.input, {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                }]}
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Duration min</Text>
              <TextInput
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
                style={[styles.input, {
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.background,
                }]}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={captureLocation}
            style={[styles.secondaryButton, { borderColor: theme.colors.primary }]}
          >
            <Ionicons name="locate-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.primary }]}>
              {location ? 'Refresh Location' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>

          {location && (
            <View style={[styles.locationBox, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
              <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
                Accuracy {Math.round(location.accuracy || 0)}m
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={submitRequest}
            disabled={submitting}
            style={[styles.primaryButton, {
              backgroundColor: submitting ? theme.colors.textSecondary : theme.colors.primary,
            }]}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Sending...' : 'Send Request'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 110,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
  },
  secondaryButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 15,
  },
  locationBox: {
    padding: 12,
    borderRadius: 12,
  },
  locationText: {
    fontSize: 13,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
