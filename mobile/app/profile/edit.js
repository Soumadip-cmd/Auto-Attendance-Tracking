import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, isLoading } = useAuth();
  const { theme } = useTheme();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    department: user?.department || '',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const result = await updateProfile(formData);

    if (result.success) {
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <Button
          variant="ghost"
          onPress={handleCancel}
          icon={<Ionicons name="arrow-back" size={24} color={theme.colors.text} />}
          style={styles.backButton}
        />
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Edit Profile
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Personal Information
            </Text>

            <Input
              label="First Name"
              value={formData.firstName}
              onChangeText={(text) => {
                setFormData({ ...formData, firstName: text });
                setErrors({ ...errors, firstName: null });
              }}
              placeholder="Enter your first name"
              icon="person-outline"
              error={errors.firstName}
            />

            <Input
              label="Last Name"
              value={formData.lastName}
              onChangeText={(text) => {
                setFormData({ ...formData, lastName: text });
                setErrors({ ...errors, lastName: null });
              }}
              placeholder="Enter your last name"
              icon="person-outline"
              error={errors.lastName}
            />

            <Input
              label="Email"
              value={formData.email}
              onChangeText={(text) => {
                setFormData({ ...formData, email: text });
                setErrors({ ...errors, email: null });
              }}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              error={errors.email}
            />

            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(text) => {
                setFormData({ ...formData, phoneNumber: text });
              }}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              icon="call-outline"
            />

            <Input
              label="Department"
              value={formData.department}
              onChangeText={(text) => {
                setFormData({ ...formData, department: text });
              }}
              placeholder="Enter your department"
              icon="briefcase-outline"
            />
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={handleCancel}
            style={styles.button}
          />
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={isLoading}
            style={styles.button}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  card: {
    marginBottom: 24,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
  },
});
