import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const enabled = await AsyncStorage.getItem('BIOMETRIC_ENABLED');
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
      await AsyncStorage.setItem('BIOMETRIC_ENABLED', 'true');
      setIsEnabled(true);
      return true;
    } catch (error) {
      console.error('Error enabling biometric:', error);
      return false;
    }
  };

  const disableBiometric = async () => {
    try {
      await AsyncStorage.setItem('BIOMETRIC_ENABLED', 'false');
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
