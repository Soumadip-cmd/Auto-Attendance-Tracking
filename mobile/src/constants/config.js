import Constants from 'expo-constants';

const ENV = {
  dev: {
    API_URL:  'http://localhost:5000/api/v1',
    WS_URL: 'http://localhost:5000',
  },
  staging: {
    API_URL: 'https://staging-api.yourapp.com/api/v1',
    WS_URL:  'https://staging-api.yourapp.com',
  },
  prod: {
    API_URL:  'https://api.yourapp.com/api/v1',
    WS_URL: 'https://api.yourapp.com',
  },
};

const getEnvVars = () => {
  const releaseChannel = Constants.expoConfig?.releaseChannel;
  
  if (__DEV__) return ENV.dev;
  if (releaseChannel === 'staging') return ENV.staging;
  return ENV.prod;
};

export const config = getEnvVars();

export const APP_CONFIG = {
  APP_NAME: 'Attendance Tracker',
  APP_VERSION: '1.0.0',
  
  // Geolocation
  LOCATION_ACCURACY: 'high',
  LOCATION_DISTANCE_FILTER: 10, // meters
  BACKGROUND_LOCATION_INTERVAL: 300000, // 5 minutes
  GEOFENCE_RADIUS_METERS: 100,
  
  // API
  API_TIMEOUT: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  
  // Storage
  TOKEN_KEY: 'auth_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  USER_KEY: 'user_data',
  THEME_KEY: 'app_theme',
  
  // Notifications
  NOTIFICATION_CHANNEL_ID: 'attendance-notifications',
  NOTIFICATION_CHANNEL_NAME: 'Attendance Notifications',
  
  // Attendance
  CHECK_IN_REMINDER_TIME: '09:00',
  CHECK_OUT_REMINDER_TIME: '18:00',
  AUTO_CHECKOUT_ENABLED: false,
  
  // UI
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 3000,
  REFRESH_INTERVAL: 60000, // 1 minute
};

export default config;