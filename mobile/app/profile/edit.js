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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { Card } from '../../src/components/common/Card';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, isLoading } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    employeeId: user?.employeeId || '',
    phoneNumber: user?.phoneNumber || '',
    department: user?.departmentRef?.name || user?.department || '',
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    const result = await updateProfile({
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
    });

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
      <View style={[styles.header, {
        backgroundColor: theme.colors.card,
        borderBottomColor: theme.colors.border,
        paddingTop: insets.top + 8,
      }]}>
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.notice, { backgroundColor: `${theme.colors.primary}14`, borderColor: `${theme.colors.primary}35` }]}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={[styles.noticeText, { color: theme.colors.text }]}>
            Employee ID, email, and department are assigned by admin. You can update your name and phone number here.
          </Text>
        </View>

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
              editable={false}
              label="Email"
              value={formData.email}
              onChangeText={() => {}}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              inputStyle={styles.readOnlyInput}
            />

            <Input
              editable={false}
              label="Employee ID"
              value={formData.employeeId || 'Pending admin assignment'}
              onChangeText={() => {}}
              placeholder="Employee ID"
              icon="card-outline"
              inputStyle={styles.readOnlyInput}
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
              editable={false}
              label="Department"
              value={formData.department}
              onChangeText={() => {}}
              placeholder="Department assigned by admin"
              icon="briefcase-outline"
              inputStyle={styles.readOnlyInput}
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
  notice: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
  readOnlyInput: {
    opacity: 0.75,
  },
});
