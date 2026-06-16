import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './storage';

export const BIOMETRIC_KEYS = {
  enabled: 'biometric_enabled',
  email: 'biometric_email',
  refreshToken: 'biometric_refresh_token',
  legacyAccessToken: 'biometric_token',
  legacyPassword: 'biometric_password',
};

export const getBiometricState = async () => {
  const [enabled, email, refreshToken] = await Promise.all([
    AsyncStorage.getItem(BIOMETRIC_KEYS.enabled),
    AsyncStorage.getItem(BIOMETRIC_KEYS.email),
    secureStorage.getItem(BIOMETRIC_KEYS.refreshToken),
  ]);

  return {
    enabled: enabled === 'true' && !!refreshToken,
    email,
    hasRefreshToken: !!refreshToken,
  };
};

export const getBiometricRefreshToken = async () => {
  return secureStorage.getItem(BIOMETRIC_KEYS.refreshToken);
};

export const saveBiometricSession = async ({ email, refreshToken }) => {
  if (!email || !refreshToken) {
    throw new Error('Email and refresh token are required for biometric setup');
  }

  await Promise.all([
    AsyncStorage.setItem(BIOMETRIC_KEYS.enabled, 'true'),
    AsyncStorage.setItem(BIOMETRIC_KEYS.email, email),
    AsyncStorage.removeItem(BIOMETRIC_KEYS.legacyAccessToken),
    AsyncStorage.removeItem(BIOMETRIC_KEYS.legacyPassword),
    secureStorage.setItem(BIOMETRIC_KEYS.refreshToken, refreshToken),
  ]);
};

export const disableBiometricSession = async () => {
  await Promise.all([
    AsyncStorage.setItem(BIOMETRIC_KEYS.enabled, 'false'),
    AsyncStorage.removeItem(BIOMETRIC_KEYS.legacyAccessToken),
    AsyncStorage.removeItem(BIOMETRIC_KEYS.legacyPassword),
    secureStorage.removeItem(BIOMETRIC_KEYS.refreshToken),
  ]);
};

export const clearBiometricSession = async () => {
  await Promise.all([
    AsyncStorage.removeItem(BIOMETRIC_KEYS.enabled),
    AsyncStorage.removeItem(BIOMETRIC_KEYS.email),
    AsyncStorage.removeItem(BIOMETRIC_KEYS.legacyAccessToken),
    AsyncStorage.removeItem(BIOMETRIC_KEYS.legacyPassword),
    secureStorage.removeItem(BIOMETRIC_KEYS.refreshToken),
  ]);
};
