import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/hooks/useTheme';
import { Card } from '../../src/components/common/Card';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { authAPI } from '../../src/services/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const response = await authAPI.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      if (response.success) {
        Alert.alert(
          'Success',
          'Password changed successfully',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <View style={styles.iconContainer}>
            <View style={[styles.icon, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="key" size={32} color={theme.colors.primary} />
            </View>
          </View>

          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            Please enter your current password and choose a new password
          </Text>

          <View style={styles.form}>
            <Input
              label="Current Password"
              value={formData.currentPassword}
              onChangeText={(text) => {
                setFormData({ ...formData, currentPassword: text });
                setErrors({ ...errors, currentPassword: null });
              }}
              placeholder="Enter current password"
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.currentPassword}
            />

            <Input
              label="New Password"
              value={formData.newPassword}
              onChangeText={(text) => {
                setFormData({ ...formData, newPassword: text });
                setErrors({ ...errors, newPassword: null });
              }}
              placeholder="Enter new password"
              secureTextEntry
              icon="lock-open-outline"
              error={errors.newPassword}
            />

            <Input
              label="Confirm New Password"
              value={formData.confirmPassword}
              onChangeText={(text) => {
                setFormData({ ...formData, confirmPassword: text });
                setErrors({ ...errors, confirmPassword: null });
              }}
              placeholder="Confirm new password"
              secureTextEntry
              icon="lock-open-outline"
              error={errors.confirmPassword}
            />
          </View>

          <View style={styles.requirements}>
            <Text style={[styles.requirementsTitle, { color: theme.colors.text }]}>
              Password Requirements:
            </Text>
            <View style={styles.requirement}>
              <Ionicons
                name={formData.newPassword.length >= 6 ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={formData.newPassword.length >= 6 ? theme.colors.success : theme.colors.textSecondary}
              />
              <Text style={[styles.requirementText, { color: theme.colors.textSecondary }]}>
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirement}>
              <Ionicons
                name={formData.newPassword === formData.confirmPassword && formData.newPassword ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={formData.newPassword === formData.confirmPassword && formData.newPassword ? theme.colors.success : theme.colors.textSecondary}
              />
              <Text style={[styles.requirementText, { color: theme.colors.textSecondary }]}>
                Passwords match
              </Text>
            </View>
          </View>
        </Card>

        <Button
          title="Change Password"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />
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
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    padding: 20,
    marginBottom: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 24,
  },
  form: {
    gap: 16,
    marginBottom: 20,
  },
  requirements: {
    marginTop: 8,
  },
  requirementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  requirementText: {
    fontSize: 12,
  },
  submitButton: {
    marginBottom: 20,
  },
});
