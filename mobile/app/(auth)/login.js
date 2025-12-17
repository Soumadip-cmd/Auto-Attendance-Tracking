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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { useBiometric } from '../../src/hooks/useBiometric';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { theme } = useTheme();
  const { isAvailable, isEnabled, biometricType, authenticate } = useBiometric();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showBiometric, setShowBiometric] = useState(false);

  // Check if biometric login is available on mount
  React.useEffect(() => {
    const checkBiometric = async () => {
      const savedEmail = await AsyncStorage.getItem('biometric_email');
      setShowBiometric(isAvailable && isEnabled && !!savedEmail);
      if (savedEmail) setEmail(savedEmail);
    };
    checkBiometric();
  }, [isAvailable, isEnabled]);

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
      // Save email for biometric login if enabled
      if (isEnabled) {
        await AsyncStorage.setItem('biometric_email', email);
        await AsyncStorage.setItem('biometric_token', result.data?.token || '');
      }
      router.replace('/(tabs)');
    } else {
      Alert.alert('Login Failed', result.error || 'Invalid credentials');
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const success = await authenticate(`Login to Attendance Tracker`);
      
      if (success) {
        // Retrieve saved credentials
        const savedToken = await AsyncStorage.getItem('biometric_token');
        const savedEmail = await AsyncStorage.getItem('biometric_email');
        
        if (savedToken && savedEmail) {
          // Verify token with backend
          const result = await login({ token: savedToken, biometric: true });
          
          if (result.success) {
            router.replace('/(tabs)');
          } else {
            Alert.alert(
              'Session Expired',
              'Please login again with your credentials.',
              [{ text: 'OK', onPress: () => setShowBiometric(false) }]
            );
          }
        } else {
          Alert.alert('Error', 'No saved credentials found. Please login with email and password.');
          setShowBiometric(false);
        }
      }
    } catch (error) {
      console.error('Biometric error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style={theme.isDarkMode ? 'light' :  'dark'} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Welcome Back!  👋
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors. textSecondary }]}>
            Sign in to continue tracking your attendance
          </Text>
        </View>

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

          {showBiometric && (
            <>
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors. border }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textSecondary }]}>
                  OR
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              </View>

              <Button
                title={`Login with ${biometricType || 'Biometric'}`}
                onPress={handleBiometricLogin}
                variant="outline"
                icon={<Text style={{ fontSize: 20 }}>🔐</Text>}
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.footerLink, { color: theme. colors.primary }]}>
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
    justifyContent: 'center',
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems:  'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
  },
  footer:  {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});