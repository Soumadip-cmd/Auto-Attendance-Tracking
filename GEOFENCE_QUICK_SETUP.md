# Quick Setup Guide - Geofence System

## Installation Steps

### 1. Backend Setup

```bash
cd backend
npm install
```

The geofence model, controller, and routes are already created. No additional packages needed.

### 2. Web Admin Panel Setup

```bash
cd web

# Install Google Maps package
npm install @react-google-maps/api lucide-react

# Make sure .env file has Google Maps API key
# VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 3. Mobile App Setup

```bash
cd mobile

# Already has react-native-maps configured
# Just ensure your app.config.js has Google Maps API key
```

## First Time Usage

### Step 1: Start Backend
```bash
cd backend
npm run dev
```

### Step 2: Start Web Admin
```bash
cd web
npm run dev
```

### Step 3: Login as Admin
- Open http://localhost:5173 (or your Vite port)
- Login with admin credentials

### Step 4: Create Geofences
1. Click "Geofences" in sidebar
2. Click anywhere on the map to set location
3. Fill in details:
   - **Name**: "Main Office"
   - **Radius**: 100 (meters)
   - **Type**: office
   - **Color**: Blue
4. Click "Create"

### Step 5: Test on Mobile
```bash
cd mobile
npx expo start
```

1. Open app on phone
2. Go to "Map" tab
3. You should see the geofences you created
4. Try to check-in from Home tab

## Google Maps API Key Setup

### Get API Key:
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable APIs:
   - Maps JavaScript API
   - Maps SDK for Android
   - Maps SDK for iOS
   - Geocoding API (optional)
4. Create credentials → API Key
5. Copy the API key

### Add to Projects:

**Backend (.env):**
```env
# Not required for backend
```

**Web (.env):**
```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX
```

**Mobile (app.config.js):**
```javascript
export default {
  expo: {
    // ...
    android: {
      config: {
        googleMaps: {
          apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX"
        }
      }
    },
    ios: {
      config: {
        googleMapsApiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX"
      }
    }
  }
}
```

## Testing the System

### 1. Test Geofence Creation (Web Admin)
```bash
# Login as admin
# Navigate to Geofences page
# Click on map
# Fill form and create
# Verify geofence appears on map
```

### 2. Test Geofence API (Postman/curl)
```bash
# Get all geofences
curl http://localhost:5000/api/v1/geofences \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check if location is in geofence
curl -X POST http://localhost:5000/api/v1/geofences/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude": 28.6139, "longitude": 77.2090}'
```

### 3. Test Mobile App
1. Open app
2. Go to Map tab
3. Enable location permissions
4. Wait for location to load
5. Verify geofences appear
6. Check distance status
7. Try to check-in (should work if inside, fail if outside)

## Common Issues

### Issue: Map not loading on web
**Solution:**
- Check if VITE_GOOGLE_MAPS_API_KEY is set in web/.env
- Verify API key has Maps JavaScript API enabled
- Check browser console for errors

### Issue: Geofences not appearing on mobile
**Solution:**
- Check if backend is running
- Verify mobile can connect to backend API
- Check API_URL in mobile/src/constants/config.js
- Ensure geofences exist (create via web admin)

### Issue: Check-in fails with "Outside Geofence"
**Solution:**
- Verify GPS accuracy is good (< 20 meters)
- Check if you're actually inside the geofence radius
- Use Map tab to see your location vs geofence
- Increase geofence radius if needed
- Ensure geofence is "active"

### Issue: "Cannot find module 'Geofence'"
**Solution:**
- Restart backend server
- Check backend/src/models/Geofence.js exists
- Verify it's exported in backend/src/models/index.js

## Package Installation Summary

**Backend - No new packages needed:**
- ✅ All dependencies already installed
- ✅ MongoDB with 2dsphere support

**Web - Install Google Maps:**
```bash
npm install @react-google-maps/api
```

**Mobile - Already configured:**
- ✅ react-native-maps already in package.json
- ✅ expo-location already configured

## Next Steps

1. ✅ Create at least one geofence via web admin
2. ✅ Test check-in from mobile app
3. ✅ Verify attendance records in admin panel
4. ✅ Create multiple geofences for different offices
5. ✅ Configure working hours per geofence (optional)
6. ✅ Test with real employees

## Production Deployment

### Before deploying:
1. Restrict Google Maps API key to specific domains/apps
2. Enable only required Google Maps APIs
3. Set up billing alerts for Maps API usage
4. Use environment-specific API keys
5. Test thoroughly with real GPS locations

### Environment Variables:

**Backend:**
```env
NODE_ENV=production
MONGODB_URI=mongodb://...
JWT_SECRET=your_secret
```

**Web:**
```env
VITE_API_URL=https://your-api.com/api/v1
VITE_GOOGLE_MAPS_API_KEY=production_key
```

**Mobile:**
- Update app.config.js with production API URL
- Use separate Google Maps API key for production
- Test with real devices before release

## Support

For issues:
1. Check GEOFENCE_SYSTEM_COMPLETE.md for detailed documentation
2. Review console/terminal errors
3. Test API endpoints with Postman
4. Verify all environment variables are set

---

**Last Updated:** December 2024
**Version:** 1.0.0
