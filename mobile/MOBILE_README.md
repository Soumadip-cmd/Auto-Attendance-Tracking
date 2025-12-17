# 📱 Auto Attendance Tracking - Mobile App

Complete React Native (Expo) mobile application for the Auto Attendance Tracking system.

## ✨ Features Implemented

### 🔐 Authentication
- **Login Screen** - Email/password authentication with validation
- **Register Screen** - User registration with employee details
- **Auto-navigation** - Automatic routing based on auth state
- **Token Management** - Secure token storage and refresh mechanism

### 🏠 Home Dashboard
- **Status Card** - Shows check-in/out status with time
- **Interactive Map** - Real-time location with geofence visualization
- **Weekly Stats** - Quick view of attendance for current week
- **Quick Actions** - Fast access to history, reports, settings

### ✅ Attendance Management
- **Smart Check-in** - Geofence-validated check-in system
- **Check-out** - Duration calculation and work summary
- **History View** - Complete attendance history with filters
- **Calendar Integration** - Month-wise attendance records

### 📊 Reports & Analytics
- **Statistics Dashboard** - Present, absent, late counts
- **Time Analytics** - Average check-in/out times
- **Attendance Rate** - Visual progress indicators
- **Export Options** - PDF and Excel export (coming soon)

### 👤 Profile & Settings
- **User Profile** - Display personal and employee information
- **Account Settings** - Password change, notifications
- **Privacy Controls** - Location tracking preferences
- **Data Management** - View, export, delete options

### 📍 Location Services
- **Real-time Tracking** - Foreground location updates
- **Background Tracking** - Location tracking when app is closed
- **Geofence Detection** - Automatic proximity calculations
- **Map Visualization** - User location and office geofences on map

### 🔔 Advanced Features
- **Context API** - Global state management with AppContext
- **WebSocket Integration** - Real-time attendance updates
- **Offline Support** - Queue and sync when back online
- **Error Handling** - Comprehensive error management
- **Loading States** - User-friendly loading indicators

## 📂 Project Structure

```
mobile/
├── app/                          # Expo Router screens
│   ├── (auth)/                  # Authentication screens
│   │   ├── login.js            # Login screen
│   │   ├── register.js         # Registration screen
│   │   └── _layout.js          # Auth layout
│   ├── (tabs)/                 # Main app tabs
│   │   ├── index.js            # Home/Dashboard
│   │   ├── attendance.js       # Attendance history
│   │   ├── reports.js          # Reports & analytics
│   │   ├── profile.js          # Profile & settings
│   │   └── _layout.js          # Tab navigation
│   ├── _layout.js              # Root layout with AppProvider
│   └── index.js                # Entry point
│
├── src/
│   ├── components/              # Reusable components
│   │   ├── common/             # Common UI components
│   │   │   ├── Button.js       # Custom button component
│   │   │   ├── Input.js        # Input field with validation
│   │   │   ├── Card.js         # Card container
│   │   │   ├── Loading.js      # Loading indicator
│   │   │   └── index.js        # Component exports
│   │   └── attendance/         # Attendance-specific components
│   │
│   ├── context/                 # Context providers
│   │   └── AppContext.js       # Main app context (Auth, Attendance, Location, Geofence)
│   │
│   ├── services/                # API and services
│   │   ├── api.js              # API client with interceptors
│   │   ├── locationService.js  # Location tracking service
│   │   ├── websocket.js        # WebSocket connection
│   │   └── notificationService.js
│   │
│   ├── hooks/                   # Custom hooks
│   │   ├── useAuth.js          # Authentication hook
│   │   ├── useLocation.js      # Location hook
│   │   └── useTheme.js         # Theme hook
│   │
│   ├── utils/                   # Utility functions
│   │   ├── storage.js          # Secure storage helpers
│   │   ├── dateUtils.js        # Date formatting
│   │   ├── geoUtils.js         # Geolocation calculations
│   │   └── validation.js       # Form validation
│   │
│   ├── constants/               # Constants and config
│   │   ├── config.js           # App configuration
│   │   ├── colors.js           # Color palette
│   │   └── theme.js            # Theme configuration
│   │
│   └── store/                   # State management (Zustand)
│       ├── authStore.js        # Auth state (backup)
│       └── attendanceStore.js  # Attendance state (backup)
│
└── assets/                      # Static assets
    └── images/
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16+)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- Backend API running

### Installation

1. **Install Dependencies**
```bash
cd mobile
npm install
```

2. **Configure Environment**
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your backend URL
# For Android Emulator: http://10.0.2.2:5000/api/v1
# For iOS Simulator: http://localhost:5000/api/v1
# For Physical Device: http://YOUR_IP:5000/api/v1
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
EXPO_PUBLIC_WS_URL=ws://192.168.1.100:5000
```

3. **Start Development Server**
```bash
npm start
# or
npx expo start
```

4. **Run on Device/Emulator**
- Press `a` for Android
- Press `i` for iOS
- Scan QR code with Expo Go app

## 🔧 Configuration

### API Configuration
Edit `src/constants/config.js`:
```javascript
export const API_URL = process.env.EXPO_PUBLIC_API_URL;
export const WS_URL = process.env.EXPO_PUBLIC_WS_URL;

export const APP_CONFIG = {
  LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
  GEOFENCE_RADIUS: 100, // 100 meters
  MAX_OFFLINE_LOCATIONS: 100,
};
```

### Location Permissions
Configure in `app.json`:
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We need your location to track attendance.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "We need your location to track attendance even when the app is closed."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

## 📱 App Flow

### Authentication Flow
```
Launch App
    ↓
Check Auth Token
    ↓
┌─────────────────┬─────────────────┐
│   Not Logged In │     Logged In   │
└────────┬────────┴────────┬────────┘
         ↓                 ↓
   Login Screen      Home Dashboard
         ↓                 ↓
   Enter Credentials   Check-in/out
         ↓                 ↓
    Validate          Track Location
         ↓                 ↓
   Store Token       View History
         ↓                 ↓
   Redirect Home     View Reports
```

### Check-in Flow
```
User Opens App
    ↓
Request Location Permission
    ↓
Start Location Tracking
    ↓
Get Current Location
    ↓
Check Geofence Proximity
    ↓
┌─────────────────┬─────────────────┐
│  Inside Fence   │  Outside Fence  │
└────────┬────────┴────────┬────────┘
         ↓                 ↓
  Enable Check-in    Disable Check-in
         ↓                 ↓
  User Taps Button   Show Distance
         ↓                 ↓
   Send to API       User Moves
         ↓                 ↓
   Success Response   Re-check Location
         ↓
   Update UI
         ↓
   Show Check-out Button
```

## 🧩 Key Components

### AppContext Provider
Central state management for the entire app:
```javascript
import { useApp } from '../context/AppContext';

function MyComponent() {
  const {
    // Auth
    user, isAuthenticated, login, logout,
    // Attendance
    checkIn, checkOut, todayAttendance,
    // Location
    currentLocation, isInsideGeofence,
    // Geofence
    geofences, nearestGeofence,
  } = useApp();
  
  // Use these values in your component
}
```

### API Services
All API calls are centralized:
```javascript
import { authAPI, attendanceAPI, locationAPI, geofenceAPI } from '../services/api';

// Login
const response = await authAPI.login({ email, password });

// Check-in
const result = await attendanceAPI.checkIn({ location, geofenceId });

// Track location
await locationAPI.track(locationData);
```

### Location Service
Handles all location tracking:
```javascript
import locationService from '../services/locationService';

// Start tracking
await locationService.startTracking((location) => {
  console.log('Location updated:', location);
});

// Stop tracking
await locationService.stopTracking();

// Get current location
const location = await locationService.getCurrentLocation();
```

## 🎨 UI Components

All reusable UI components are in `src/components/common/`:

```javascript
import { Button, Input, Card, Loading } from '../components/common';

// Button
<Button 
  title="Check In"
  onPress={handleCheckIn}
  variant="primary"  // primary, secondary, danger, success, outline
  size="medium"      // small, medium, large
  loading={loading}
  fullWidth
/>

// Input
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  placeholder="Enter email"
  error={errors.email}
  keyboardType="email-address"
  leftIcon={<Icon />}
/>

// Card
<Card 
  header="Attendance"
  footer="View Details"
  onPress={() => {}}
>
  <Text>Card content</Text>
</Card>
```

## 📊 State Management

### Using AppContext
```javascript
// In any component
const {
  user,
  isAuthenticated,
  login,
  logout,
  checkIn,
  checkOut,
  currentLocation,
  isInsideGeofence,
} = useApp();

// Login
const result = await login({ email, password });
if (result.success) {
  router.replace('/(tabs)');
}

// Check-in
if (isInsideGeofence) {
  const result = await checkIn(currentLocation);
}
```

## 🗺️ Maps & Geofencing

### Display Map with Geofences
```javascript
import MapView, { Marker, Circle } from 'react-native-maps';

<MapView
  region={{
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  }}
  showsUserLocation
>
  {/* User Marker */}
  <Marker
    coordinate={{
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
    }}
    title="You are here"
  />
  
  {/* Geofence Circle */}
  {geofences.map((geofence) => (
    <Circle
      key={geofence.id}
      center={{
        latitude: geofence.latitude,
        longitude: geofence.longitude,
      }}
      radius={geofence.radius}
      fillColor="rgba(59, 130, 246, 0.2)"
      strokeColor="rgba(59, 130, 246, 0.5)"
    />
  ))}
</MapView>
```

## 🔔 Notifications & Real-time Updates

### WebSocket Connection
```javascript
import websocketService from '../services/websocket';

// Listen for events
websocketService.on('attendance:updated', (data) => {
  console.log('Attendance updated:', data);
});

// Emit events
websocketService.emit('location:update', locationData);
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e
```

## 📦 Build & Deploy

### Development Build
```bash
# Android
npx expo run:android

# iOS
npx expo run:ios
```

### Production Build
```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Build for both
eas build --platform all
```

### Submit to Stores
```bash
# Submit to Play Store
eas submit --platform android

# Submit to App Store
eas submit --platform ios
```

## 📝 Environment Variables

Create `.env` file:
```bash
# Backend API
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
EXPO_PUBLIC_WS_URL=ws://192.168.1.100:5000

# Maps (optional)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here
```

## 🐛 Troubleshooting

### Location Not Working
1. Check permissions in device settings
2. Ensure location services are enabled
3. For iOS simulator, use Features → Location → Custom Location

### API Connection Issues
1. Verify backend is running
2. Check API URL in `.env`
3. For Android emulator, use `10.0.2.2` instead of `localhost`
4. For physical device, use computer's IP address

### Build Errors
```bash
# Clear cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules
npm install

# Reset Metro bundler
npx expo start --clear
```

## 📚 Documentation

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## ✅ What's Complete

✅ Authentication (Login/Register)  
✅ Home Dashboard with Map  
✅ Check-in/Check-out System  
✅ Attendance History  
✅ Reports & Analytics  
✅ Profile & Settings  
✅ Location Tracking (Foreground)  
✅ Geofence Detection  
✅ Real-time Updates (WebSocket)  
✅ Offline Support  
✅ Context-based State Management  
✅ Reusable UI Components  
✅ Error Handling  
✅ Form Validation  

## 🚧 Coming Soon

⏳ Background Location Tracking  
⏳ Push Notifications  
⏳ Biometric Authentication  
⏳ Dark Mode  
⏳ Multi-language Support  
⏳ Export Reports (PDF/Excel)  

---

**Ready to use! Start the backend, configure the mobile app, and begin tracking attendance!** 🎉
