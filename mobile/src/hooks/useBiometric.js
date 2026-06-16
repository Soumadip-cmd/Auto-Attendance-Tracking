import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from '../utils/storage';
import { APP_CONFIG } from '../constants/config';
import {
  disableBiometricSession,
  getBiometricState,
  saveBiometricSession,
} from '../utils/biometricAuth';

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
      const biometricState = await getBiometricState();
      setIsEnabled(biometricState.enabled);
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
      const refreshToken = await secureStorage.getItem(APP_CONFIG.REFRESH_TOKEN_KEY);
      const userJson = await secureStorage.getItem(APP_CONFIG.USER_KEY);
      const user = userJson ? JSON.parse(userJson) : null;
      const email = user?.email || null;

      if (!email || !refreshToken) {
        console.error('No active session found for biometric setup');
        return false;
      }

      const result = await authenticate(`Enable ${biometricType || 'biometric'} login`);
      if (!result.success) {
        return false;
      }

      await saveBiometricSession({ email, refreshToken });
      setIsEnabled(true);
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  };

  const disableBiometric = async () => {
    try {
      await disableBiometricSession();
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
