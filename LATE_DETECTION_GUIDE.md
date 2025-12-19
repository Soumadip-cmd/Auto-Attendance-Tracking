# Geofence-Based Late Detection System

## Overview
The attendance tracking system now includes intelligent late detection based on geofence-specific check-in times with configurable grace periods.

## How It Works

### 1. Geofence Configuration (Admin Panel)
Admins can configure check-in time settings for each geofence:

- **Expected Check-In Time**: The time employees are expected to arrive (e.g., "09:00")
- **Grace Period**: Additional minutes allowed after expected time before marking as late (e.g., 15 minutes)

**Example Configuration:**
- Expected Time: 09:00
- Grace Period: 15 minutes
- Late Threshold: 09:15 (anyone checking in after 09:15 is marked "late")

### 2. Backend Logic
When an employee checks in:

1. **Location Detection**: The system detects the employee's GPS coordinates
2. **Geofence Matching**: Finds the active geofence containing the employee's location using:
   - MongoDB `$near` query to find geofences within 10km
   - Haversine formula to calculate exact distance
   - Matches first geofence where distance ≤ radius

3. **Time Calculation**:
   ```javascript
   expectedMinutes = hours * 60 + minutes  // Convert HH:mm to minutes
   lateThreshold = expectedMinutes + gracePeriod
   currentMinutes = currentHour * 60 + currentMinute
   
   if (currentMinutes > lateThreshold) {
     status = 'late'
     isLate = true
     lateBy = currentMinutes - expectedMinutes
   } else {
     status = 'present'
   }
   ```

4. **Attendance Record**: Stores:
   - `status`: 'late' or 'present'
   - `isLate`: boolean flag
   - `lateBy`: minutes late (from expected time, not grace period)
   - `checkIn.geofence`: reference to the geofence used

### 3. Display in Mobile App
The mobile app automatically shows late status in:

- **Attendance History Card**:
  - Yellow/warning color badge
  - Clock icon
  - "Late" status label
  - Late records are counted in statistics

### 4. Display in Admin Panel

- **Attendance Page**:
  - Yellow badge with "late" text
  - Dark mode support with appropriate colors
  - Filterable by status

- **Dashboard Recent Activity**:
  - "Late" badge next to employee name
  - Yellow highlighting for late check-ins
  - Real-time updates

## Configuration Steps

### Step 1: Create/Edit Geofence (Web Admin)
1. Navigate to **Geofences** page
2. Click **Add Geofence** or edit existing one
3. Fill in basic info (name, location, radius)
4. Set **Working Hours** (for reference)
5. Configure **Check-In Settings**:
   - Expected Check-In Time: Use time picker (e.g., 09:00)
   - Grace Period: Enter minutes (0-60, default: 15)
6. Save the geofence

### Step 2: Test on Mobile App
1. Ensure location permissions are enabled
2. Go to the geofence location (within radius)
3. Check in at different times:
   - **Before expected time**: Should show "present"
   - **Within grace period**: Should show "present"
   - **After grace period**: Should show "late"

### Step 3: Verify in Admin Panel
1. **Attendance Page**: Check status column shows yellow "late" badge
2. **Dashboard**: Recent activity should show "Late" label for late check-ins
3. **Reports**: Late records are included in statistics

## Testing Scenarios

### Scenario 1: On-Time Check-In
- Geofence: Expected 09:00, Grace 15 min
- Employee checks in: 08:55
- **Result**: Status = "present"

### Scenario 2: Within Grace Period
- Geofence: Expected 09:00, Grace 15 min
- Employee checks in: 09:10
- **Result**: Status = "present"

### Scenario 3: Late Check-In
- Geofence: Expected 09:00, Grace 15 min
- Employee checks in: 09:20
- **Result**: Status = "late", lateBy = 20 minutes

### Scenario 4: Very Late Check-In
- Geofence: Expected 09:00, Grace 15 min
- Employee checks in: 10:30
- **Result**: Status = "late", lateBy = 90 minutes

### Scenario 5: No Geofence (Default Behavior)
- Employee checks in outside any geofence
- Default: Expected 09:00, Grace 15 min (hardcoded)
- **Result**: Uses default timing, status calculated accordingly

## Database Schema

### Geofence Model
```javascript
{
  name: String,
  center: { type: 'Point', coordinates: [lng, lat] },
  radius: Number, // meters
  checkInTime: {
    expectedTime: String, // "HH:mm" format
    gracePeriodMinutes: Number // 0-60
  },
  // ... other fields
}
```

### Attendance Model
```javascript
{
  user: ObjectId,
  date: Date,
  checkIn: {
    time: Date,
    location: { type: 'Point', coordinates: [lng, lat] },
    geofence: ObjectId // Reference to Geofence
  },
  status: String, // 'present', 'late', 'absent'
  isLate: Boolean,
  lateBy: Number, // minutes late from expected time
  // ... other fields
}
```

## API Endpoints

### Check-In (POST /api/v1/attendance/check-in)
```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 10,
  "notes": "Optional check-in note"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "user": "...",
    "date": "2024-01-15T00:00:00.000Z",
    "checkIn": {
      "time": "2024-01-15T09:20:00.000Z",
      "location": { "type": "Point", "coordinates": [77.2090, 28.6139] },
      "geofence": "geofence_id_here"
    },
    "status": "late",
    "isLate": true,
    "lateBy": 20
  }
}
```

## Troubleshooting

### Late detection not working
1. **Check geofence is active**: Ensure `isActive: true`
2. **Verify location**: Employee must be within geofence radius
3. **Check checkInTime configured**: Geofence must have `checkInTime.expectedTime` set
4. **Time format**: Ensure expected time is "HH:mm" format (e.g., "09:00", not "9:00 AM")

### Status showing wrong
1. **Server time**: Ensure backend server time is correct
2. **Grace period**: Verify grace period is set appropriately (default 15)
3. **Threshold calculation**: Late threshold = expected time + grace period

### Mobile app not showing late badge
1. **Check status field**: Backend must return `status: 'late'`
2. **Component rendering**: AttendanceCard component handles 'late' status
3. **Theme colors**: Verify warning color is defined in theme

### Admin panel not highlighting late
1. **Status badge styling**: Check `getStatusBadge()` function includes 'late'
2. **Dashboard recent activity**: Verify status is passed in API response
3. **Color classes**: Ensure Tailwind yellow classes are available

## Future Enhancements
- [ ] Different grace periods for different days of week
- [ ] Notification when employee is approaching late threshold
- [ ] Late trend analytics and reports
- [ ] Automatic warnings for repeated late arrivals
- [ ] Integration with leave management (skip late detection for approved leaves)
- [ ] Configurable late penalties or actions

## Related Files
- Backend:
  - `backend/src/models/Geofence.js` - Geofence schema with checkInTime
  - `backend/src/routes/attendanceRoutes.js` - Check-in logic with late detection
  - `backend/src/controllers/dashboardController.js` - Recent activity with status
  
- Web Admin:
  - `web/src/pages/Geofences.jsx` - Geofence configuration form
  - `web/src/pages/Attendance.jsx` - Status display with badges
  - `web/src/pages/Dashboard.jsx` - Recent activity with late badges
  
- Mobile App:
  - `mobile/src/components/attendance/AttendanceCard.js` - Status display
  - `mobile/app/(tabs)/attendance.js` - Attendance history
  - `mobile/src/store/attendanceStore.js` - Attendance state management
