# 🚀 Mobile App Setup & Usage Guide

## Complete Installation & Configuration

### Step 1: Prerequisites

1. **Install Node.js** (v16 or higher)
   ```bash
   node --version  # Should be v16+
   ```

2. **Install Expo CLI**
   ```bash
   npm install -g expo-cli
   ```

3. **Install Expo Go App** on your mobile device
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

4. **Start Backend Server**
   ```bash
   cd backend
   npm install
   npm run dev
   # Backend should be running on http://localhost:5000
   ```

### Step 2: Mobile App Installation

1. **Navigate to mobile folder**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install --force
   # or
   npm install
   ```

3. **Create environment file**
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

4. **Configure .env file**
   Edit `.env` with your settings:
   
   **For Development on Same Machine:**
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
   EXPO_PUBLIC_WS_URL=ws://localhost:5000
   ```
   
   **For Android Emulator:**
   ```env
   EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api/v1
   EXPO_PUBLIC_WS_URL=ws://10.0.2.2:5000
   ```
   
   **For Physical Device (Replace with your computer's IP):**
   ```env
   # Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
   EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
   EXPO_PUBLIC_WS_URL=ws://192.168.1.100:5000
   ```

### Step 3: Run the App

1. **Start Expo Development Server**
   ```bash
   npm start
   # or
   npx expo start
   ```

2. **Choose a platform:**
   - Press `a` for Android emulator
   - Press `i` for iOS simulator (Mac only)
   - Scan QR code with Expo Go app for physical device

3. **Wait for app to load**
   - First time may take a few minutes
   - App will automatically reload when you save files

### Step 4: Test the App

1. **Create Test User**
   
   From backend folder:
   ```bash
   npm run seed:admin
   ```
   
   This creates:
   - Admin: `admin@example.com` / `Admin@12345`
   - Manager: `manager@example.com` / `Manager@12345`
   - Staff: `staff@example.com` / `Staff@12345`

2. **Login to Mobile App**
   - Open the app
   - Use one of the credentials above
   - Grant location permissions when prompted

3. **Create Geofence** (Admin Panel)
   - Login to web admin panel
   - Go to Geofences
   - Create a geofence at your location

4. **Test Check-in**
   - Move inside the geofence
   - Tap "Check In" button
   - Verify attendance is recorded

## 📱 App Features & Usage

### Authentication

**Login:**
1. Open app
2. Enter email and password
3. Tap "Sign In"
4. Grant location permissions

**Register:**
1. Tap "Sign Up" on login screen
2. Fill in all fields:
   - First Name & Last Name
   - Email
   - Employee ID
   - Department
   - Password (min 8 chars, uppercase, lowercase, number)
3. Tap "Create Account"

### Home Dashboard

**Main Features:**
- Check-in/Check-out button (only works inside geofence)
- Live map showing your location and geofences
- Weekly attendance stats
- Quick action buttons

**Check-in Process:**
1. App automatically tracks your location
2. When inside geofence, check-in button becomes active
3. Tap "Check In"
4. Attendance is recorded with timestamp

**Check-out Process:**
1. Tap "Check Out" button
2. Confirm in the dialog
3. Work duration is calculated
4. Summary is displayed

### Attendance History

**View Records:**
- Shows all past attendance records
- Organized by date
- Color-coded status (Present/Late/Absent)
- Displays check-in/out times and duration

**Filter by Month:**
- Use arrows to navigate months
- Pull down to refresh

### Reports & Analytics

**Statistics:**
- Total days
- Present/Absent/Late counts
- Attendance rate percentage
- Average check-in/out times
- Average work hours
- On-time rate

**Period Selection:**
- Week
- Month
- Quarter

**Export** (Coming Soon):
- PDF reports
- Excel spreadsheets

### Profile & Settings

**Profile Information:**
- View personal details
- Employee ID
- Department
- Role

**Account Settings:**
- Change password
- Notification preferences
- Privacy settings

**Privacy Controls:**
- Enable/disable location tracking
- Data privacy settings
- View/Export/Delete data

## 🗺️ Location & Geofencing

### How It Works

1. **Location Tracking:**
   - App requests location permission
   - Tracks location every 10 seconds
   - Works in foreground (app open)
   - Background tracking coming soon

2. **Geofence Detection:**
   - App checks distance to all geofences
   - Calculates if you're inside radius
   - Shows distance to nearest office
   - Enables/disables check-in button

3. **Map Display:**
   - Blue marker: Your location
   - Green markers: Office locations
   - Circles: Geofence boundaries
   - Real-time updates

### Permissions Required

**iOS:**
- Location When In Use
- Location Always (for background tracking)

**Android:**
- Fine Location
- Coarse Location
- Background Location

## 🔧 Troubleshooting

### App Won't Connect to Backend

**Problem:** "Network Error" or "Unable to connect"

**Solutions:**
1. Verify backend is running:
   ```bash
   cd backend
   npm run dev
   ```

2. Check API URL in `.env`:
   - For emulator: `http://10.0.2.2:5000/api/v1`
   - For device: Use your computer's IP

3. Ensure device and computer are on same WiFi network

4. Disable firewall temporarily to test

5. Check backend logs for errors

### Location Not Working

**Problem:** "Location permission denied" or location not updating

**Solutions:**
1. **iOS:**
   - Settings → Privacy → Location Services
   - Enable for Expo Go
   - Select "While Using App"

2. **Android:**
   - Settings → Apps → Expo Go → Permissions
   - Enable Location → Allow all the time

3. **Simulator:**
   - iOS: Features → Location → Custom Location
   - Android: Extended controls → Location

### Check-in Button Disabled

**Problem:** Can't check in even when at office

**Solutions:**
1. Verify geofence exists in database
2. Check if you're actually inside radius
3. Refresh location (pull down on home screen)
4. Check console logs for errors
5. Verify backend geofence API is working

### App Crashes on Startup

**Solutions:**
1. Clear Expo cache:
   ```bash
   npx expo start -c
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install --force
   ```

3. Check for errors in terminal

4. Verify all required packages are installed

### Map Not Showing

**Solutions:**
1. Check internet connection
2. Grant location permissions
3. Verify react-native-maps is installed:
   ```bash
   npm install react-native-maps
   ```

4. For iOS, pod install may be required:
   ```bash
   cd ios
   pod install
   cd ..
   ```

## 🎯 Common Workflows

### Daily Usage (Staff)

1. **Morning:**
   - Open app
   - Arrive at office
   - Wait for geofence detection
   - Tap "Check In"

2. **During Day:**
   - App continues tracking (optional)
   - Can view history and stats

3. **Evening:**
   - Tap "Check Out"
   - View work duration
   - Close app

### Weekly Review

1. Open "Attendance" tab
2. Review weekly records
3. Check for any issues
4. View "Reports" for statistics

### Manager/Admin Usage

1. Login with manager/admin account
2. View all staff locations (web panel)
3. Monitor attendance in real-time
4. Generate reports
5. Manage geofences

## 🔐 Security Notes

1. **Tokens:**
   - Stored securely in device keychain
   - Auto-refresh when expired
   - Cleared on logout

2. **Location Data:**
   - Encrypted in transit
   - Only sent to your backend
   - User can disable tracking

3. **Permissions:**
   - Request only what's needed
   - User can revoke anytime
   - Graceful degradation

## 📊 Performance Tips

1. **Battery Optimization:**
   - Location updates every 10 seconds (configurable)
   - Stops tracking when checked out
   - Efficient geofence calculations

2. **Network Usage:**
   - Batches location updates
   - Offline queue for poor connectivity
   - Compressed data transfer

3. **App Performance:**
   - Lazy loading screens
   - Memoized components
   - Optimized renders

## 🚀 Advanced Configuration

### Customize Location Settings

Edit `src/constants/config.js`:

```javascript
export const APP_CONFIG = {
  // How often to update location (milliseconds)
  LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
  
  // Minimum distance to trigger update (meters)
  LOCATION_DISTANCE_INTERVAL: 50, // 50 meters
  
  // Default geofence radius (meters)
  GEOFENCE_RADIUS: 100, // 100 meters
  
  // Max locations to store offline
  MAX_OFFLINE_LOCATIONS: 100,
  
  // How often to sync offline data (milliseconds)
  SYNC_INTERVAL: 60000, // 1 minute
};
```

### Customize Theme

Edit `src/constants/theme.js`:

```javascript
export const theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    background: '#F9FAFB',
    text: '#1F2937',
  },
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
};
```

## 📱 Device Testing

### iOS Testing

1. **Simulator:**
   ```bash
   npx expo start
   # Press 'i' for iOS simulator
   ```

2. **Physical Device:**
   - Install Expo Go from App Store
   - Scan QR code
   - Allow location permissions

### Android Testing

1. **Emulator:**
   ```bash
   npx expo start
   # Press 'a' for Android emulator
   ```

2. **Physical Device:**
   - Install Expo Go from Play Store
   - Scan QR code
   - Allow location permissions
   - Enable "Allow all the time" for background tracking

## 🎉 Success Checklist

Before going live, verify:

- [ ] Backend is running and accessible
- [ ] .env file is configured correctly
- [ ] Location permissions work
- [ ] Check-in/out functions properly
- [ ] Geofences are set up
- [ ] Map displays correctly
- [ ] Reports show accurate data
- [ ] Logout works properly
- [ ] No console errors
- [ ] App doesn't crash

## 📞 Getting Help

1. **Check Console Logs:**
   - Look for error messages
   - Check API responses
   - Verify location updates

2. **Review Documentation:**
   - MOBILE_README.md
   - API.md
   - FRONTEND_GUIDE.md

3. **Common Issues:**
   - Connection: Check API URL and network
   - Location: Verify permissions
   - Check-in: Ensure inside geofence
   - Crashes: Clear cache and reinstall

## 🎊 You're All Set!

The mobile app is fully configured and ready to use! 

**Quick Test:**
1. Start backend: `cd backend && npm run dev`
2. Start mobile: `cd mobile && npm start`
3. Login with test credentials
4. Grant location permissions
5. Create a geofence at your location
6. Test check-in/out

**Enjoy your Auto Attendance Tracking System!** 🚀
