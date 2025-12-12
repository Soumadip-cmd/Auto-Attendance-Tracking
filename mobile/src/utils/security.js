import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// This should match the server's secret (for demo purposes)
// In production, this signature should be generated server-side
const LOCATION_SIGNATURE_SECRET = 'your-location-signature-secret-key-min-32-chars';

/**
 * Generate HMAC-SHA256 signature for location data
 */
export const generateLocationSignature = (longitude, latitude, timestamp) => {
  try {
    const userId = AsyncStorage.getItem('userId'); // Get from stored user data
    const data = `${userId}:${longitude}:${latitude}:${timestamp}`;
    const signature = CryptoJS.HmacSHA256(data, LOCATION_SIGNATURE_SECRET).toString();
    return signature;
  } catch (error) {
    console.error('Error generating location signature:', error);
    return '';
  }
};

/**
 * Validate location data before submission
 */
export const validateLocationData = (location) => {
  if (!location) return false;
  
  const { latitude, longitude, accuracy } = location;
  
  // Check if coordinates are valid
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return false;
  }
  
  // Check accuracy threshold
  if (accuracy && accuracy > 100) {
    console.warn('Location accuracy is low:', accuracy);
  }
  
  return true;
};

/**
 * Sanitize user input
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');
};

/**
 * Generate secure random string
 */
export const generateRandomString = (length = 32) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};
