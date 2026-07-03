import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { Input } from '../../src/components/common/Input';
import { Button } from '../../src/components/common/Button';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { disableBiometricSession, getBiometricRefreshToken, getBiometricState, saveBiometricSession } from '../../src/utils/biometricAuth';
export default function LoginScreen() {
  const router = useRouter();
  const {
    login,
    loginWithRefreshToken,
    isLoading
  } = useAuth();
  const {
    theme
  } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [biometricLoading, setBiometricLoading] = useState(false);
  React.useEffect(() => {
    checkBiometric();
  }, []);
  const checkBiometric = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const biometricState = await getBiometricState();
      setBiometricAvailable(hasHardware && isEnrolled);
      setBiometricEnabled(biometricState.enabled);
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        setBiometricType('Face ID');
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        setBiometricType('Fingerprint');
      }
      if (biometricState.email) {
        setEmail(biometricState.email);
      }
    } catch (error) {
      console.error('Biometric check error:', error);
      setBiometricAvailable(false);
      setBiometricEnabled(false);
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
    const result = await login({
      email,
      password
    });
    if (result.success) {
      await setupBiometricAfterPasswordLogin(email, result.data?.refreshToken);
      router.replace('/(tabs)');
      return;
    }
    Alert.alert('Login Failed', result.error || 'Invalid credentials');
  };
  const setupBiometricAfterPasswordLogin = async (loginEmail, refreshToken) => {
    if (!biometricAvailable || !refreshToken) {
      return;
    }
    const biometricState = await getBiometricState();
    if (biometricState.enabled) {
      await saveBiometricSession({
        email: loginEmail,
        refreshToken
      });
      setBiometricEnabled(true);
      return;
    }
    await new Promise(resolve => {
      Alert.alert('Enable Biometric Login', `Use ${biometricType} for quick login on this device?`, [{
        text: 'Not Now',
        style: 'cancel',
        onPress: resolve
      }, {
        text: 'Enable',
        onPress: async () => {
          try {
            const authResult = await LocalAuthentication.authenticateAsync({
              promptMessage: `Enable ${biometricType} Login`,
              fallbackLabel: 'Use password',
              cancelLabel: 'Cancel',
              disableDeviceFallback: false
            });
            if (authResult.success) {
              await saveBiometricSession({
                email: loginEmail,
                refreshToken
              });
              setBiometricEnabled(true);
            }
          } catch (error) {
            console.error('Biometric setup error:', error);
          } finally {
            resolve();
          }
        }
      }], {
        cancelable: false
      });
    });
  };
  const handleBiometricLogin = async () => {
    try {
      setBiometricLoading(true);
      const biometricState = await getBiometricState();
      if (!biometricState.enabled || !biometricState.email) {
        Alert.alert('Setup Required', `Please login with email and password first to register ${biometricType} on this device.`, [{
          text: 'OK'
        }]);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Login with ${biometricType}`,
        fallbackLabel: 'Use password',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false
      });
      if (!result.success) {
        return;
      }
      const refreshToken = await getBiometricRefreshToken();
      if (!refreshToken) {
        await disableBiometricSession();
        setBiometricEnabled(false);
        Alert.alert('Setup Required', `Please login with email and password to register ${biometricType} on this device.`, [{
          text: 'OK'
        }]);
        return;
      }
      const loginResult = await loginWithRefreshToken(refreshToken);
      if (loginResult.success) {
        await saveBiometricSession({
          email: biometricState.email,
          refreshToken: loginResult.data.refreshToken
        });
        setBiometricEnabled(true);
        router.replace('/(tabs)');
        return;
      }
      await disableBiometricSession();
      setBiometricEnabled(false);
      Alert.alert('Biometric Setup Needed', `Please login with email and password to register ${biometricType} again on this device.`, [{
        text: 'OK'
      }]);
    } catch (error) {
      console.error('Biometric error:', error);
      Alert.alert('Error', `${biometricType} authentication failed. Please try again.`);
    } finally {
      setBiometricLoading(false);
    }
  };
  const showBiometricLogin = biometricAvailable && biometricEnabled;
  return <KeyboardAvoidingView style={[styles.container, {
    backgroundColor: theme.colors.background
  }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style={theme.isDarkMode ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, {
          color: theme.colors.text
        }]}>Welcome Back!</Text>
          <Text style={[styles.subtitle, {
          color: theme.colors.textSecondary
        }]}>
            Sign in to continue tracking your attendance
          </Text>
        </View>

        {showBiometricLogin && <TouchableOpacity style={[styles.biometricButton, {
        backgroundColor: theme.colors.primary + '15',
        borderColor: theme.colors.primary,
        opacity: biometricLoading ? 0.5 : 1
      }]} onPress={handleBiometricLogin} disabled={biometricLoading || isLoading}>
            <View style={[styles.biometricIconContainer, {
          backgroundColor: theme.colors.primary
        }]}>
              <Ionicons name={biometricLoading ? 'hourglass' : biometricType === 'Face ID' ? 'scan' : 'finger-print'} size={32} color="#ffffff" />
            </View>
            <View style={styles.biometricTextContainer}>
              <Text style={[styles.biometricTitle, {
            color: theme.colors.text
          }]}>
                {biometricLoading ? 'Logging in...' : 'Quick Login'}
              </Text>
              <Text style={[styles.biometricSubtitle, {
            color: theme.colors.textSecondary
          }]}>
                {biometricLoading ? 'Please wait' : `Use ${biometricType}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
          </TouchableOpacity>}

        <View style={styles.form}>
          <Input label="Email" value={email} onChangeText={text => {
          setEmail(text);
          setErrors({
            ...errors,
            email: null
          });
        }} placeholder="Enter your email" keyboardType="email-address" autoCapitalize="none" icon="mail-outline" error={errors.email} />

          <Input label="Password" value={password} onChangeText={text => {
          setPassword(text);
          setErrors({
            ...errors,
            password: null
          });
        }} placeholder="Enter your password" secureTextEntry icon="lock-closed-outline" error={errors.password} />

          <TouchableOpacity style={styles.forgotPassword} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[styles.forgotPasswordText, {
            color: theme.colors.primary
          }]}>
              Forgot Password?
            </Text>
          </TouchableOpacity>

          <Button title="Login" onPress={handleLogin} loading={isLoading} style={{
          marginTop: 24
        }} />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, {
          color: theme.colors.textSecondary
        }]}>
            Don't have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register_new')}>
            <Text style={[styles.footerLink, {
            color: theme.colors.primary
          }]}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60
  },
  header: {
    marginBottom: 32
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: "Inter_700Bold",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular"
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 24
  },
  biometricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16
  },
  biometricTextContainer: {
    flex: 1
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4
  },
  biometricSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular"
  },
  form: {
    marginBottom: 24
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 8
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular"
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: "Inter_600SemiBold"
  }
});
