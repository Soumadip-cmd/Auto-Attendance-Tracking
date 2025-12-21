import 'dotenv/config';

export default {
  expo: { 
    name: "GEO Attendance Tracker",
    slug: "attendance-tracker",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#6366f1"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.geoattendance.freelixe",
      deploymentTarget: "15.1",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "Location access for attendance tracking.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "Background location access.",
        NSCameraUsageDescription: "Camera access for profile pictures."
      }
    },
    android: {
      package: "com.geoattendance.freelixe",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "VIBRATE",
        "USE_BIOMETRIC",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ],
      adaptiveIcon: {
        backgroundColor: "#6366f1"
      },
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || "AIzaSyAMtx40m6yOIrtxQa7SOF3xNWUzrYldOkI"
        }
      }
    },
    web: {
      bundler: "metro"
    },
    plugins: [
      "expo-router",
      "expo-location",
      "expo-notifications",
      "expo-secure-store",
      "expo-local-authentication",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            buildToolsVersion: "34.0.0"
          }
        }
      ]
    ],
    scheme: "attendancetracker",
    extra: {
      API_URL: process.env.API_URL || "http://192.168.31.102:6000/api/v1",
      WS_URL: process.env.WS_URL || "http://192.168.31.102:6000",
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
      eas: {
        projectId: "c4a1d50a-2bae-4cb0-a413-6e98a5b9eafa"
      }
    }
  }
};
