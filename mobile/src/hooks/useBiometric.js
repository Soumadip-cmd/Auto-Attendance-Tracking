import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../utils/storage';
import { APP_CONFIG } from '../constants/config';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'biometric_email';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';

export const useBiometric = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState(null);

  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricPreference();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      setIsAvailable(compatible && enrolled);
      if (types.length > 0) {
        // Get first available type
        setBiometricType(
          types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
            ? 'Face ID'
            : types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
            ? 'Fingerprint'
            : 'Biometric'
        );
      }
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  };

  const loadBiometricPreference = async () => {
    try {
      const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(enabled === 'true');
    } catch (error) {
      console.error('Error loading biometric preference:', error);
    }
  };

  const authenticate = async (reason = 'Authenticate to continue') => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason,
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
        disableDeviceFallback: false,
      });

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  };

  const enableBiometric = async () => {
    try {
      let savedEmail = await AsyncStorage.getItem(BIOMETRIC_EMAIL_KEY);
      let savedToken = await AsyncStorage.getItem(BIOMETRIC_TOKEN_KEY);

      if (!savedToken) {
        savedToken = await secureStorage.getItem(APP_CONFIG.TOKEN_KEY);
      }
      
      if (!savedEmail) {
        const userJson = await secureStorage.getItem(APP_CONFIG.USER_KEY);
        const user = userJson ? JSON.parse(userJson) : null;
        savedEmail = user?.email || null;
      }

      if (!savedEmail || !savedToken) {
        console.error('No active session found for biometric setup');
        return false;
      }

      const result = await authenticate(`Enable ${biometricType || 'biometric'} login`);
      if (!result.success) {
        return false;
      }

      await AsyncStorage.setItem(BIOMETRIC_EMAIL_KEY, savedEmail);
      await AsyncStorage.setItem(BIOMETRIC_TOKEN_KEY, savedToken);
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  };

  const disableBiometric = async () => {
    try {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
      // Optionally clear saved credentials when disabling
      // await AsyncStorage.removeItem(BIOMETRIC_EMAIL_KEY);
      // await AsyncStorage.removeItem(BIOMETRIC_TOKEN_KEY);
      setIsEnabled(false);
      return true;
    } catch (error) {
      console.error('Error disabling biometric:', error);
      return false;
    }
  };

  return {
    isAvailable,
    isEnabled,
    biometricType,
    authenticate,
    enableBiometric,
    disableBiometric,
  };
};
