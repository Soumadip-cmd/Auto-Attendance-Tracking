# 🚀 Quick Start Guide - Full Application

## Prerequisites
- Node.js 18+ installed
- MongoDB running
- Android Studio / Xcode (for mobile development)
- Expo CLI installed globally

## 1️⃣ Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - PORT=5000
# - MONGODB_URI=mongodb://localhost:27017/attendance-tracker
# - JWT_SECRET=your-secret-key
# - JWT_REFRESH_SECRET=your-refresh-secret

# Start MongoDB (if not running)
# Windows: net start MongoDB
# Mac/Linux: sudo systemctl start mongod

# Seed admin user
npm run seed:admin
# Default admin: admin@example.com / Admin@123

# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

## 2️⃣ Mobile App Setup

```bash
# Navigate to mobile folder
cd mobile

# Install dependencies
npm install

# Create .env file
# Add your backend URL
echo "API_URL=http://YOUR_IP:5000/api/v1" > .env

# Example:
# For local network: API_URL=http://192.168.1.100:5000/api/v1
# For localhost: API_URL=http://localhost:5000/api/v1

# Install Expo CLI if not installed
npm install -g expo-cli

# Start Expo development server
npm start
```

This will open Expo DevTools in your browser.

## 3️⃣ Run on Device/Simulator

### Option A: Physical Device (Recommended)
1. Install Expo Go app from Play Store/App Store
2. Scan QR code from Expo DevTools
3. App will load on your device

### Option B: Android Emulator
```bash
# Start Android emulator first
# Then run:
npm run android
```

### Option C: iOS Simulator (Mac only)
```bash
npm run ios
```

## 4️⃣ Login & Test

### Default Admin Account
- **Email**: admin@example.com
- **Password**: Admin@123

### Test Flow
1. **Login** with admin credentials
2. **Grant Permissions** (Location, Camera, Notifications)
3. **Check-In** from Home screen
4. **View Map** to see live tracking
5. **Edit Profile** to upload photo
6. **Admin Panel** to manage users
7. **Check-Out** when done

## 🎯 Feature Checklist

### For Regular Users
- [ ] Login successfully
- [ ] Grant location permissions
- [ ] Check-in from home
- [ ] View location on map
- [ ] Edit profile & upload photo
- [ ] View attendance history
- [ ] Check-out at end of day
- [ ] Change password

### For Admin Users
- [ ] Access admin panel
- [ ] View dashboard stats
- [ ] Manage employees
- [ ] View all attendance records
- [ ] Activate/deactivate users
- [ ] View user details

## 📱 Network Configuration

### For Physical Device Testing
Your device and computer must be on the same network.

**Find your IP address:**

**Windows:**
```bash
ipconfig
# Look for IPv4 Address under your active network
```

**Mac/Linux:**
```bash
ifconfig
# Look for inet under your active network (usually en0 or wlan0)
```

**Update mobile/.env:**
```
API_URL=http://YOUR_IP:5000/api/v1
```

Example: `API_URL=http://192.168.1.100:5000/api/v1`

## 🔧 Troubleshooting

### Backend Issues

**MongoDB Connection Error:**
```bash
# Check if MongoDB is running
# Windows:
sc query MongoDB

# Mac/Linux:
sudo systemctl status mongod

# If not running, start it
# Windows:
net start MongoDB

# Mac/Linux:
sudo systemctl start mongod
```

**Port Already in Use:**
```bash
# Change PORT in backend/.env
PORT=5001
```

### Mobile App Issues

**Cannot Connect to Backend:**
1. Verify backend is running (`http://localhost:5000/api/v1/health`)
2. Check mobile/.env has correct IP address
3. Ensure phone and computer on same WiFi
4. Try using tunnel mode: `npm run start:tunnel`

**Location Not Working:**
1. Grant all location permissions
2. Enable GPS on device
3. Check if location services enabled
4. Try restarting app

**App Won't Load:**
```bash
# Clear cache and restart
expo start -c

# Or
npm start -- --reset-cache
```

**Build Errors:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install

# Clear watchman cache (Mac/Linux)
watchman watch-del-all
```

## 🔐 Creating Additional Users

### Method 1: Via Mobile App
1. Logout from current account
2. Tap "Register" on login screen
3. Fill in user details
4. Register new user

### Method 2: Via Backend Script
```bash
cd backend
node src/scripts/createAdmin.js
# Follow prompts to create user
```

### Method 3: Via API (Postman)
```http
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "employee"
}
```

## 📊 Test Scenarios

### Scenario 1: Basic Attendance
1. Login as employee
2. Check-in (morning)
3. Work throughout day
4. Check-out (evening)
5. View attendance history

### Scenario 2: Location Tracking
1. Check-in
2. Go to Map tab
3. Start live tracking
4. Move around
5. See path on map
6. Stop tracking

### Scenario 3: Admin Management
1. Login as admin
2. Go to Admin tab
3. View dashboard stats
4. Search for employee
5. View employee details
6. Check attendance records

### Scenario 4: Profile Management
1. Go to Profile tab
2. Tap Edit Profile
3. Upload new photo
4. Update information
5. Save changes
6. Change password

## 🎨 Customization

### Change App Theme
Settings → Appearance → Toggle Dark Mode

### Change API URL
Edit `mobile/src/constants/config.js`:
```javascript
export const config = {
  API_URL: 'YOUR_NEW_URL',
  // ...
};
```

### Modify Geofence Settings
Edit in backend or create via admin panel

## 📦 Production Build

### Android APK
```bash
cd mobile
eas build --platform android --profile preview
```

### iOS
```bash
cd mobile
eas build --platform ios --profile preview
```

## 🎯 Next Steps

After setup is complete:
1. ✅ Test all features thoroughly
2. ✅ Create test users and data
3. ✅ Configure geofences for your location
4. ✅ Customize working hours
5. ✅ Set up push notifications
6. ✅ Configure email settings (backend)
7. ✅ Deploy backend to cloud (AWS/Heroku/DigitalOcean)
8. ✅ Build production mobile apps

## 🎊 Success Criteria

You're all set when:
- ✅ Backend runs without errors
- ✅ Mobile app loads successfully
- ✅ Can login with admin account
- ✅ Check-in/check-out works
- ✅ Location tracking works
- ✅ Map displays correctly
- ✅ Profile editing works
- ✅ Admin panel accessible
- ✅ All permissions granted

## 🆘 Need Help?

1. Check backend logs: `backend/logs/`
2. Check mobile console in Expo DevTools
3. Verify network connectivity
4. Review error messages
5. Check this guide's troubleshooting section

## 🎉 You're Ready!

Everything is now set up and working! Enjoy your fully functional attendance tracking system with:
- ✅ Mobile check-in/check-out
- ✅ Live location tracking
- ✅ Interactive maps
- ✅ Admin dashboard
- ✅ Profile management
- ✅ Complete backend integration

**Happy tracking! 🚀**
