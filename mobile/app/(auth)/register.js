import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { useApp } from '../../src/context/AppContext';
import { useTheme } from '../../src/hooks/useTheme';

export default function RegisterScreen() {
  const router = useRouter();
  const { register, authLoading } = useApp();
  const { theme } = useTheme();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const askForBiometric = async (email, password) => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (!hasHardware || !isEnrolled) {
      // No biometric available, just proceed
      router.replace('/(tabs)');
      return;
    }

    let biometricType = 'Biometric';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'Face ID';
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = 'Fingerprint';
    }

    Alert.alert(
      '🔐 Enable Quick Login',
      `Would you like to enable ${biometricType} login for faster access?`,
      [
        {
          text: 'Not Now',
          style: 'cancel',
          onPress: () => router.replace('/(tabs)'),
        },
        {
          text: 'Enable',
          onPress: async () => {
            try {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: `Setup ${biometricType} Login`,
                fallbackLabel: 'Cancel',
                cancelLabel: 'Cancel',
              });

              if (result.success) {
                await AsyncStorage.setItem('biometric_email', email);
                await AsyncStorage.setItem('biometric_password', password);
                await AsyncStorage.setItem('biometric_enabled', 'true');
                
                Alert.alert(
                  'Success!',
                  `${biometricType} login has been enabled. You can now use it to login quickly.`,
                  [{ text: 'Great!', onPress: () => router.replace('/(tabs)') }]
                );
              } else {
                router.replace('/(tabs)');
              }
            } catch (error) {
              console.error('Biometric setup error:', error);
              router.replace('/(tabs)');
            }
          },
        },
      ]
    );
  };

  const handleRegister = async () => {
    if (!validate()) return;

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      // Ask if user wants to enable biometric
      await askForBiometric(formData.email, formData.password);
    } else {
      Alert.alert('Registration Failed', result.error || 'Please try again');
    }
  };

  const updateField = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: null });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={theme.isDarkMode ? 'light' : 'dark'} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Create Account 🚀
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Sign up to start tracking your attendance
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="First Name"
                value={formData.firstName}
                onChangeText={(text) => updateField('firstName', text)}
                placeholder="John"
                icon="person-outline"
                error={errors.firstName}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="Last Name"
                value={formData.lastName}
                onChangeText={(text) => updateField('lastName', text)}
                placeholder="Doe"
                icon="person-outline"
                error={errors.lastName}
              />
            </View>
          </View>

          <Input
            label="Email"
            value={formData.email}
            onChangeText={(text) => updateField('email', text)}
            placeholder="john.doe@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
            error={errors.email}
          />

          <Input
            label="Password"
            value={formData.password}
            onChangeText={(text) => updateField('password', text)}
            placeholder="At least 6 characters"
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.password}
          />

          <Input
            label="Confirm Password"
            value={formData.confirmPassword}
            onChangeText={(text) => updateField('confirmPassword', text)}
            placeholder="Re-enter password"
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.confirmPassword}
          />

          <Button
            title="Create Account"
            onPress={handleRegister}
            loading={authLoading}
            style={{ marginTop: 24 }}
          />

          {/* Info about biometric */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.primary + '10' }]}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.text }]}>
              After registration, you'll be able to enable quick biometric login
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
              Sign In
            </Text>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});
