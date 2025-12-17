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
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');

  React.useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setBiometricAvailable(hasHardware && isEnrolled);
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      }

      // Load saved email if exists
      const savedEmail = await AsyncStorage.getItem('biometric_email');
      if (savedEmail) setEmail(savedEmail);
    } catch (error) {
      console.error('Biometric check error:', error);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    const result = await login({ email, password });

    if (result.success) {
      // Save credentials for biometric login
      await AsyncStorage.setItem('biometric_email', email);
      await AsyncStorage.setItem('biometric_enabled', 'true');
      if (result.data?.token) {
        await AsyncStorage.setItem('biometric_token', result.data.token);
      }
      
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('biometric_email');
      const savedToken = await AsyncStorage.getItem('biometric_token');

      if (!savedEmail) {
        Alert.alert(
          'Setup Required',
          'Please login with email and password first to enable biometric login.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Login with ${biometricType}`,
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        // Try to login with saved token
        if (savedToken) {
          const loginResult = await login({ token: savedToken, biometric: true });
          
          if (loginResult.success) {
            router.replace('/(tabs)');
          } else {
            Alert.alert(
              'Session Expired',
              'Your session has expired. Please login with email and password.',
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert('Error', 'No saved credentials found. Please login with email and password.');
        }
      }
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', 'Biometric authentication failed. Please try again.');
    }
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
            Welcome Back! 👋
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Sign in to continue tracking your attendance
          </Text>
        </View>

        {/* Biometric Quick Login - Prominent at top */}
        {biometricAvailable && (
          <TouchableOpacity
            style={[styles.biometricButton, { 
              backgroundColor: theme.colors.primary + '15',
              borderColor: theme.colors.primary 
            }]}
            onPress={handleBiometricLogin}
          >
            <View style={[styles.biometricIconContainer, { backgroundColor: theme.colors.primary }]}>
              <Ionicons 
                name={biometricType === 'Face ID' ? 'scan' : 'finger-print'} 
                size={32} 
                color="#ffffff" 
              />
            </View>
            <View style={styles.biometricTextContainer}>
              <Text style={[styles.biometricTitle, { color: theme.colors.text }]}>
                Quick Login
              </Text>
              <Text style={[styles.biometricSubtitle, { color: theme.colors.textSecondary }]}>
                Use {biometricType}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setErrors({ ...errors, email: null });
            }}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail-outline"
            error={errors.email}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setErrors({ ...errors, password: null });
            }}
            placeholder="Enter your password"
            secureTextEntry
            icon="lock-closed-outline"
            error={errors.password}
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <Button
            title="Login"
            onPress={handleLogin}
            loading={isLoading}
            style={{ marginTop: 24 }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.footerLink, { color: theme.colors.primary }]}>
              Sign Up
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
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24,
  },
  biometricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  biometricTextContainer: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  biometricSubtitle: {
    fontSize: 14,
  },
  form: {
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
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
