# Geofence-Based Attendance Tracking System

## Overview

This project is a **Geofence-Based Attendance Tracking System** that allows employees to check in and check out from work only when they are within designated office locations (geofences). Administrators can create and manage multiple office locations using an interactive map interface.

## How It Works

### 1. **Admin Creates Geofences**
Administrators can create office locations (geofences) through the web admin panel:
- Navigate to **Geofences** page in the admin panel
- Click anywhere on the Google Map to set a location
- Configure the geofence:
  - **Name**: Office name (e.g., "Main Office", "Branch Office")
  - **Radius**: Area in meters (10m to 10km)
  - **Type**: office, branch, site, or custom
  - **Color**: Visual identifier on map
  - **Description**: Additional details

### 2. **Mobile App Shows All Geofences**
The mobile app displays:
- All active geofences as colored circles on the map
- User's current location with a marker
- Real-time distance to nearest geofence
- Visual indicators (green = inside, red = outside)
- Status card showing if user can check-in

### 3. **Attendance Validation**
When an employee attempts to check in:
- System validates user's GPS location
- Checks if location is within ANY active geofence
- Only allows check-in if user is inside a geofence
- Records which geofence was used for attendance

## Features

### Backend (Node.js/Express)

#### Geofence Model (`backend/src/models/Geofence.js`)
- **GeoJSON Point** for center coordinates
- **Radius** in meters (10m - 10km)
- **Working Hours** configuration per geofence
- **2dsphere** index for efficient spatial queries
- Methods for distance calculation and point-in-circle checks

#### Geofence Controller (`backend/src/controllers/geofenceController.js`)
- **Create Geofence**: Admin-only endpoint
- **Get All Geofences**: List all locations
- **Update/Delete Geofence**: Admin management
- **Check Location**: Validate if coordinates are within any geofence
- **Find Nearest**: Get closest geofence to a point
- **Get Nearby**: Find geofences within radius

#### API Endpoints
```
POST   /api/v1/geofences              - Create geofence (Admin)
GET    /api/v1/geofences              - Get all geofences
GET    /api/v1/geofences/:id          - Get single geofence
PUT    /api/v1/geofences/:id          - Update geofence (Admin)
DELETE /api/v1/geofences/:id          - Delete geofence (Admin)
POST   /api/v1/geofences/check        - Check if location is in geofence
GET    /api/v1/geofences/nearby       - Get nearby geofences
```

#### Attendance Validation
The attendance controller now validates geofences before check-in:
```javascript
// Check if location is within any geofence
const containingGeofences = await Geofence.findContainingPoint(longitude, latitude);

if (containingGeofences.length === 0) {
  return res.status(400).json({
    success: false,
    message: 'You must be within an office location to check in',
    errorCode: 'OUTSIDE_GEOFENCE'
  });
}
```

### Web Admin Panel (React)

#### Geofences Page (`web/src/pages/Geofences.jsx`)
Features:
- **Interactive Google Map** with click-to-create
- **Visual geofence display** with colored circles
- **Geofence list** showing all locations
- **Create/Edit form** with validation
- **Real-time preview** of geofence on map
- **Info windows** on marker click
- **Responsive design** for all screen sizes

Usage:
1. Click on map to set location
2. Form auto-fills with coordinates
3. Enter name, radius, and other details
4. Click "Create" to save
5. Existing geofences shown as circles
6. Click markers for info/edit/delete options

### Mobile App (React Native/Expo)

#### Map Screen (`mobile/app/(tabs)/map.js`)
Features:
- **Google Maps** integration
- **Multiple geofence display** with colored circles
- **User location marker** (green if inside, red if outside)
- **Nearest geofence calculation**
- **Real-time distance tracking**
- **Visual status card** showing:
  - Distance to nearest office
  - "INSIDE" or "OUTSIDE" status
  - How many meters closer needed
  - Total geofence count

#### Geofence API Service (`mobile/src/services/api.js`)
```javascript
export const geofenceAPI = {
  getAll: (params) => api.get('/geofences', { params }),
  checkLocation: (lat, lon) => api.post('/geofences/check', { latitude: lat, longitude: lon }),
  getNearby: (lat, lon, maxDistance) => api.get('/geofences/nearby', { params: { latitude: lat, longitude: lon, maxDistance } }),
};
```

## Database Schema

### Geofence Collection
```javascript
{
  _id: ObjectId,
  name: String,                    // "Main Office"
  description: String,             // Optional description
  center: {
    type: "Point",
    coordinates: [longitude, latitude]  // GeoJSON format
  },
  radius: Number,                  // meters (10-10000)
  type: String,                    // 'office' | 'branch' | 'site' | 'custom'
  color: String,                   // Hex color for map display
  isActive: Boolean,               // Enable/disable geofence
  workingHours: {
    enabled: Boolean,
    schedule: {
      monday: { start: "09:00", end: "17:00", enabled: true },
      // ... other days
    },
    timezone: "Asia/Kolkata"
  },
  createdBy: ObjectId,            // Admin who created
  updatedBy: ObjectId,            // Admin who last updated
  createdAt: Date,
  updatedAt: Date
}
```

## Distance Calculation

The system uses the **Haversine Formula** to calculate the distance between two GPS coordinates:

```javascript
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};
```

## Setup Instructions

### Backend Setup

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Ensure MongoDB is running** with 2dsphere index support

3. **Start server:**
   ```bash
   npm run dev
   ```

4. **Test geofence endpoints** using Postman or curl

### Web Admin Setup

1. **Install dependencies:**
   ```bash
   cd web
   npm install
   ```

2. **Install Google Maps package:**
   ```bash
   npm install @react-google-maps/api
   ```

3. **Add Google Maps API key to `.env`:**
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Navigate to Geofences page** and create locations

### Mobile App Setup

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Ensure Google Maps is configured** in `app.config.js`

3. **Start development:**
   ```bash
   npx expo start
   ```

4. **Test on device** (GPS required for accurate location)

## Usage Flow

### For Administrators:

1. **Login to web admin panel**
2. **Navigate to Geofences** page
3. **Click on map** where office is located
4. **Fill in details:**
   - Name: "Downtown Office"
   - Radius: 100 (meters)
   - Type: office
   - Color: Blue
5. **Click Create**
6. **Geofence appears** on map immediately
7. **Repeat** for multiple locations

### For Employees:

1. **Open mobile app**
2. **Go to Map tab**
3. **View all office locations** on map
4. **Check distance status**:
   - Green circle = Inside office
   - Red circle = Outside office
5. **Navigate to Home tab**
6. **Click Check-in** (only works if inside geofence)
7. **System validates location**
8. **Success or error message** based on location

## Error Handling

### Backend Validation:
- ✅ Coordinates must be valid (lat: -90 to 90, lon: -180 to 180)
- ✅ Radius must be between 10m and 10km
- ✅ Name is required
- ✅ Only admins can create/modify geofences
- ✅ Check-in fails if outside all geofences

### Mobile App:
- ✅ Handles no geofences scenario
- ✅ Shows loading states
- ✅ Displays error messages
- ✅ Requests location permissions
- ✅ Refreshes location on demand

## Security Considerations

1. **Admin-Only Operations**: Only admins can create/modify geofences
2. **GPS Validation**: Server validates coordinates on check-in
3. **Active Status**: Disabled geofences don't allow check-ins
4. **Audit Trail**: Logs who created/modified geofences
5. **Distance Verification**: Server-side distance calculation (not client)

## Performance Optimization

1. **2dsphere Index**: Fast spatial queries in MongoDB
2. **Client Caching**: Mobile app caches geofences
3. **Efficient Queries**: Only active geofences loaded
4. **Batch Operations**: Support for multiple geofences
5. **Lazy Loading**: Map markers loaded on demand

## Future Enhancements

- [ ] **Polygon Geofences**: Support complex shapes
- [ ] **Time-based Rules**: Different check-in times per geofence
- [ ] **Automatic Geofence Selection**: Smart office detection
- [ ] **Geofence Analytics**: Usage statistics per location
- [ ] **Push Notifications**: Alert when entering/leaving geofence
- [ ] **QR Code Fallback**: Alternative check-in method
- [ ] **Offline Support**: Cache geofences for offline use
- [ ] **Multiple Geofence Check-in**: Allow check-in from any office

## Troubleshooting

### "No Office Locations" Error:
- **Solution**: Admin needs to create geofences first
- Go to web admin → Geofences → Create locations

### "Outside Geofence" Error:
- **Check GPS accuracy**: Ensure phone has good GPS signal
- **Verify radius**: Check if radius is large enough
- **Check active status**: Ensure geofence is active
- **View on map**: Confirm actual location vs geofence

### Map Not Loading:
- **Web**: Verify Google Maps API key in `.env`
- **Mobile**: Check `app.config.js` for API key
- **Both**: Ensure API key has Maps JavaScript API enabled

### Distance Calculation Issues:
- **GPS Accuracy**: Wait for better accuracy (< 20m)
- **Refresh Location**: Use refresh button to update
- **Check Coordinates**: Verify geofence coordinates are correct

## API Examples

### Create Geofence:
```bash
curl -X POST http://localhost:5000/api/v1/geofences \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Office",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "radius": 100,
    "type": "office",
    "color": "#3b82f6"
  }'
```

### Check Location:
```bash
curl -X POST http://localhost:5000/api/v1/geofences/check \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "isInside": true,
    "geofences": [
      {
        "id": "abc123",
        "name": "Main Office",
        "distance": 45,
        "radius": 100
      }
    ]
  }
}
```

## License

MIT

## Support

For issues or questions, please contact the development team or create an issue in the repository.
