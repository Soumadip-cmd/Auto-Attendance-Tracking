# Multiple Geofence Support Guide

## ✅ Feature Status: FULLY IMPLEMENTED

Your application already supports **multiple geofences** with full admin management and staff check-in capabilities.

---

## 🎯 How It Works

### 1. **Admin Creates Multiple Geofences** (Web Dashboard)

**Location:** `/geofences` page in web admin panel

**Features:**
- ➕ **Create unlimited geofences** with unique names
- 🗺️ **Set location** using latitude/longitude coordinates
- 📏 **Define radius** (1m - 10,000m)
- 🏢 **Categorize** as Campus, Building, Department, or Custom
- ⏰ **Set working hours** specific to each geofence
- 🎨 **Assign colors** for visual identification on maps
- 👥 **Assign specific users** (optional - if empty, applies to all staff)
- 🔔 **Configure alerts** (entry, exit, violations)
- ✅ **Activate/Deactivate** geofences as needed

**Example Geofences:**
```javascript
1. Main Office
   - Type: Campus
   - Location: 40.7128° N, 74.0060° W
   - Radius: 100m
   - Working Hours: 9:00 AM - 6:00 PM

2. Downtown Branch
   - Type: Building
   - Location: 40.7489° N, 73.9680° W
   - Radius: 150m
   - Working Hours: 8:30 AM - 5:30 PM

3. Client Site A
   - Type: Custom
   - Location: 40.7580° N, 73.9855° W
   - Radius: 75m
   - Working Hours: 7:00 AM - 3:00 PM
```

---

### 2. **Staff Can Check In from ANY Geofence** (Mobile App)

**Automatic Features:**
- 📍 **Real-time location tracking** every 10 seconds
- 🔍 **Auto-detection** when entering any active geofence
- 🏢 **Display current geofence** name in the app
- ⏰ **Show working hours** from the current/nearest geofence
- ✅ **Enable check-in** button only when inside a geofence
- 🚫 **Prevent check-in** when outside all geofences

**Manual Check-In:**
- Tap "Check In" button when inside any active geofence
- App automatically associates attendance with the detected geofence
- Working hours and late detection based on that geofence's schedule

---

## 📱 Mobile App Features

### Home Screen Indicators

```
┌─────────────────────────────────┐
│  Today's Status                 │
│  ✓ Inside Main Office          │ ← Shows current geofence
│                                  │
│  Check In:  9:15 AM             │
│  Check Out: --:--               │
│                                  │
│  📌 Work Hours: 9:00 AM - 6:00 PM │ ← From geofence config
└─────────────────────────────────┘
```

### Multiple Geofence Display
- **Current Location:** Shows which geofence you're inside
- **Distance Calculation:** Displays distance to all configured geofences
- **Working Hours:** Automatically shows hours for current/nearest geofence
- **Smart Check-In:** Only enabled when inside a valid geofence

---

## 🔧 Backend Implementation

### Database Structure

**Geofence Model** (`backend/src/models/Geofence.js`):
```javascript
{
  name: String,
  description: String,
  type: 'campus' | 'building' | 'department' | 'custom',
  center: {
    type: 'Point',
    coordinates: [longitude, latitude]
  },
  radius: Number, // in meters
  workingHours: {
    enabled: Boolean,
    schedule: [{
      day: String,
      startTime: String, // HH:mm
      endTime: String    // HH:mm
    }]
  },
  isActive: Boolean,
  assignedUsers: [ObjectId], // Optional specific users
  color: String,
  alerts: { ... }
}
```

### API Endpoints

**Admin Endpoints** (require admin role):
```
POST   /api/v1/geofences          - Create new geofence
GET    /api/v1/geofences          - List all geofences
GET    /api/v1/geofences/:id      - Get single geofence
PUT    /api/v1/geofences/:id      - Update geofence
DELETE /api/v1/geofences/:id      - Delete geofence
```

**Staff Endpoints:**
```
GET    /api/v1/geofences          - Get all active geofences
POST   /api/v1/geofences/check    - Check if location is in any geofence
```

### Check-In Logic

```javascript
// 1. User attempts check-in
// 2. Backend finds all geofences containing user's location
const geofences = await Geofence.findContainingPoint(longitude, latitude);

// 3. Use first matching geofence
const geofence = geofences[0];

// 4. Validate working hours for THAT specific geofence
const schedule = geofence.workingHours.schedule.find(s => s.day === today);

// 5. Calculate if late based on geofence's hours
const expectedStart = schedule.startTime; // e.g., "09:00"

// 6. Record attendance with geofence reference
await Attendance.create({
  user: userId,
  checkIn: {
    time: now,
    geofence: geofence._id, // Links to specific geofence
    location: { ... }
  },
  isLate: calculatedFromGeofenceHours,
  lateBy: minutes
});
```

---

## 📊 Use Cases

### Scenario 1: Multiple Office Locations
```
Company has 3 offices:
- Head Office: 9:00 AM - 6:00 PM
- Branch A: 8:30 AM - 5:30 PM
- Branch B: 10:00 AM - 7:00 PM

Staff members check in at their assigned/visited location.
Late detection uses that location's working hours.
```

### Scenario 2: Field Staff
```
Sales team visits multiple client sites:
- Client Site 1: Geofence radius 100m
- Client Site 2: Geofence radius 150m
- Client Site 3: Geofence radius 200m

Check-in allowed at any client site.
Attendance report shows which site they visited.
```

### Scenario 3: Department-Specific Areas
```
University campus with multiple departments:
- Engineering Building: 8:00 AM - 5:00 PM
- Arts Building: 9:00 AM - 6:00 PM
- Science Lab: 7:00 AM - 9:00 PM

Different working hours per department geofence.
```

---

## 🎨 Web Admin Panel Features

### Geofence List View
- **Card-based layout** showing all geofences
- **Color-coded** borders matching geofence colors
- **Status indicators** (Active/Inactive)
- **Quick actions:** Edit, Delete, Toggle Active
- **Info display:** Type, Radius, Working Hours

### Create/Edit Geofence Modal
```
┌────────────────────────────────┐
│ Create New Geofence            │
├────────────────────────────────┤
│ Name: *                        │
│ Description:                   │
│ Type: [Campus ▼]              │
│                                │
│ 📍 Location                    │
│ Latitude: *                    │
│ Longitude: *                   │
│ Radius (m): *                  │
│                                │
│ ⏰ Working Hours               │
│ ☑ Enabled                     │
│ Start: [09:00]                │
│ End: [18:00]                  │
│                                │
│ 🔔 Alerts                      │
│ ☑ Entry Alert                 │
│ ☑ Exit Alert                  │
│                                │
│ 🎨 Color: [#6366f1]           │
│ ✓ Active                       │
│                                │
│ [Cancel] [Save Geofence]      │
└────────────────────────────────┘
```

---

## 🔍 Advanced Features

### 1. Distance Calculation
- Real-time distance to all geofences displayed in logs
- Helps debug why check-in might not be working
- Shows exact meters to center of each geofence

### 2. Geofence Priority
- When user is inside **multiple overlapping geofences**
- System uses the **first matching geofence** found
- You can customize priority logic in `geofenceController.js`

### 3. User Assignment
- **Empty assignedUsers array** = applies to ALL staff
- **Specific users** = only those users can check in at this geofence
- Useful for restricting access to certain locations

### 4. Working Hours Flexibility
- **Per-day schedules** supported
- **Different hours for different days** (e.g., shorter Friday hours)
- **24/7 geofences** possible by setting wide hours

---

## 🛠️ Testing Multiple Geofences

### Admin Setup (Web):
1. Login to web admin panel
2. Navigate to `/geofences`
3. Click "Create New Geofence"
4. Fill in details for first location
5. Save and repeat for additional locations

### Mobile Testing:
1. Open mobile app
2. Go to Map tab to see all geofences
3. Check home screen shows current geofence when inside
4. Try checking in from different geofence locations
5. Verify working hours display correctly per geofence

### Backend Verification:
```bash
# Check all geofences in database
GET /api/v1/geofences

# Check if location is in any geofence
POST /api/v1/geofences/check
{
  "latitude": 40.7128,
  "longitude": -74.0060
}

# View attendance with geofence data
GET /api/v1/attendance/today
# Response includes checkIn.geofence reference
```

---

## 📈 Reports & Analytics

### Attendance Reports Include:
- **Geofence name** where check-in occurred
- **Location coordinates** at check-in time
- **Working hours** applied from that geofence
- **Late calculation** based on geofence schedule

### Admin Dashboard Shows:
- Attendance by geofence location
- Most used geofences
- Compliance per location
- Working hours variations

---

## 🚀 Summary

✅ **Admin can create unlimited geofences**
✅ **Each geofence has unique settings** (location, hours, alerts)
✅ **Staff can check in from ANY active geofence**
✅ **Mobile app shows current geofence in real-time**
✅ **Working hours auto-adjust** based on geofence
✅ **Late detection uses geofence-specific** schedules
✅ **Attendance records include** which geofence was used
✅ **Full API support** for all geofence operations

---

## 🔗 Related Files

**Backend:**
- `backend/src/models/Geofence.js` - Database model
- `backend/src/controllers/geofenceController.js` - Business logic
- `backend/src/routes/geofenceRoutes.js` - API routes
- `backend/src/controllers/attendanceController.js` - Check-in logic

**Mobile:**
- `mobile/src/services/geofenceService.js` - Geofence monitoring
- `mobile/app/(tabs)/index.js` - Home screen with geofence status
- `mobile/app/(tabs)/map.js` - Map view of all geofences
- `mobile/src/context/AppContext.js` - Geofence state management

**Web:**
- `web/src/pages/Geofences.jsx` - Admin geofence management
- `web/src/services/api.js` - API integration

---

**Last Updated:** December 21, 2025
