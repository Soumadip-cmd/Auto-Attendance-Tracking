# 🚀 Quick Start Cheatsheet

## 5-Minute Setup

### 1. Backend Setup (Terminal 1)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with MongoDB connection
npm run seed:admin
npm run dev
# ✅ Backend running on http://localhost:5000
```

### 2. Mobile Setup (Terminal 2)
```bash
cd mobile
npm install --force
cp .env.example .env
# Edit .env:
# EXPO_PUBLIC_API_URL=http://YOUR_IP:5000/api/v1
# EXPO_PUBLIC_WS_URL=ws://YOUR_IP:5000
npm start
# Press 'a' for Android or 'i' for iOS
```

### 3. Test Login
```
Email: staff@example.com
Password: Staff@12345
```

---

## File Structure Overview

```
✅ mobile/
  ├── app/
  │   ├── (auth)/           # Login & Register screens
  │   ├── (tabs)/           # Main app screens (Home, Attendance, Reports, Profile)
  │   └── _layout.js        # Root navigation
  ├── src/
  │   ├── context/          # AppContext (global state)
  │   ├── components/       # Reusable UI components
  │   ├── services/         # API, Location, WebSocket
  │   └── constants/        # Config & theme
  ├── MOBILE_README.md      # Full documentation
  ├── SETUP_GUIDE.md        # Detailed setup
  └── .env                  # Configuration
```

---

## Key Features

### ✅ Implemented
- 🔐 Login/Register with validation
- 🏠 Dashboard with map & geofences
- ✅ Check-in/out system
- 📅 Attendance history
- 📊 Reports & analytics
- 👤 Profile & settings
- 📍 Real-time location tracking
- 🗺️ Interactive maps
- 🔔 WebSocket updates
- 💾 Offline support

---

## Common Commands

```bash
# Start app
npm start

# Clear cache
npx expo start -c

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios

# Install new package
npm install package-name

# Build for production
eas build --platform all
```

---

## Environment Variables

```env
# .env file
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
EXPO_PUBLIC_WS_URL=ws://192.168.1.100:5000

# Android Emulator
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api/v1

# iOS Simulator
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

## Test Credentials

```javascript
// Admin
admin@example.com / Admin@12345

// Manager
manager@example.com / Manager@12345

// Staff
staff@example.com / Staff@12345
```

---

## App Context Usage

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
}
```

---

## Troubleshooting Quick Fixes

### Can't connect to backend?
1. Check backend is running: `cd backend && npm run dev`
2. Verify API URL in `.env`
3. Use computer's IP for physical device
4. Use `10.0.2.2` for Android emulator

### Location not working?
1. Grant permissions in device settings
2. Enable location services
3. For simulator: Features → Location → Custom

### Check-in disabled?
1. Verify geofence exists in database
2. Check if inside geofence radius
3. Refresh location (pull down)

### App crashes?
```bash
npx expo start -c
rm -rf node_modules && npm install --force
```

---

## Important Files

- `app/_layout.js` - Root navigation with AppProvider
- `src/context/AppContext.js` - Global state management
- `src/services/api.js` - API client with auth
- `src/constants/config.js` - App configuration
- `.env` - Environment variables

---

## API Endpoints Used

```javascript
// Auth
POST /api/v1/auth/login
POST /api/v1/auth/register
GET  /api/v1/auth/me

// Attendance
POST /api/v1/attendance/check-in
POST /api/v1/attendance/check-out
GET  /api/v1/attendance/history

// Location
POST /api/v1/locations
GET  /api/v1/geofences
```

---

## Workflow Example

```javascript
// Login
const result = await login({ email, password });
if (result.success) router.replace('/(tabs)');

// Check-in
if (isInsideGeofence) {
  const result = await checkIn(currentLocation);
  Alert.alert('Success', 'Checked in!');
}

// View history
const history = await getAttendanceHistory({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
});
```

---

## Screen Routes

```javascript
// Auth
/(auth)/login
/(auth)/register

// Main Tabs
/(tabs)            // Home Dashboard
/(tabs)/attendance // History
/(tabs)/reports    // Analytics
/(tabs)/profile    // Settings
```

---

## Status Indicators

- 🟢 Green = Present
- 🔴 Red = Absent
- 🟠 Orange = Late
- 🔵 Blue = Checked In

---

## Performance Tips

1. Location updates: Every 10 seconds
2. Offline queue: Max 100 locations
3. Battery efficient: Stops when checked out
4. Network: Batches updates

---

## Next Steps

1. ✅ Test on device
2. ✅ Create geofences via web admin
3. ✅ Test check-in/out
4. ✅ Review reports
5. ✅ Configure for production
6. 🚀 Deploy!

---

## Build for Production

```bash
# Install EAS
npm install -g eas-cli

# Initialize
eas init

# Build
eas build --platform android
eas build --platform ios

# Submit
eas submit --platform android
eas submit --platform ios
```

---

## Support

📖 Full docs: `MOBILE_README.md`  
🔧 Setup guide: `SETUP_GUIDE.md`  
✅ Complete info: `MOBILE_APP_COMPLETE.md`

---

**Status: ✅ 100% COMPLETE & READY TO USE!**

Start backend → Start mobile → Login → Grant permissions → Check-in → Done! 🎉
