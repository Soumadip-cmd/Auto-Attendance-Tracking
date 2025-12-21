import 'dotenv/config';

export default {
  expo: { 
    name: "GEO Attendance Tracker",
    slug: "attendance-tracker",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#6366f1"
    },
    icon: "./assets/icon.png",
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
        foregroundImage: "./assets/adaptive-icon.png",
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
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "35.0.0"
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
        projectId: "d33612ab-4b02-41a7-8a38-257a681de251"
      }
    }
  }
};
