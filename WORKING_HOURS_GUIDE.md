# Working Hours - Geofence-Based Configuration

## Overview
Working hours are now dynamically fetched from each geofence configuration. Different geofences can have different working hours (e.g., office: 9am-6pm, warehouse: 7am-4pm).

## How It Works

### 1. Configure Working Hours per Geofence

**Admin Web Panel → Geofences → Working Hours Section:**
- **Start Time**: Beginning of work day (e.g., "09:00")
- **End Time**: End of work day (e.g., "18:00")

**Example Configurations:**
```
Office Campus:
  Start: 09:00 (9:00 AM)
  End: 18:00 (6:00 PM)
  Expected Hours: 9 hours

Warehouse:
  Start: 07:00 (7:00 AM)
  End: 16:00 (4:00 PM)
  Expected Hours: 9 hours

Night Shift:
  Start: 22:00 (10:00 PM)
  End: 06:00 (6:00 AM)
  Expected Hours: 8 hours
```

### 2. Automatic Calculations During Check-In

When an employee checks in:
```javascript
1. System detects geofence location
2. Retrieves working hours from geofence:
   - Start: "09:00"
   - End: "18:00"
3. Calculates expected hours:
   expectedHours = (18*60 + 0) - (9*60 + 0) / 60 = 9 hours
4. Stores in attendance record:
   - expectedHours: 9
   - checkIn.geofence: <geofence_id>
```

### 3. Duration Calculation at Check-Out

When employee checks out:
```javascript
1. Retrieves check-in time
2. Calculates actual duration:
   actualHours = (checkOut - checkIn) / 3600000 ms
3. Compares with expected hours:
   - actualHours >= expectedHours → Full day
   - actualHours < expectedHours * 0.5 → Half day
4. Updates status accordingly
```

## Database Schema

### Geofence Working Hours
```javascript
{
  workingHours: {
    start: "09:00",  // HH:mm format
    end: "18:00"     // HH:mm format
  }
}
```

### Attendance Record
```javascript
{
  expectedHours: 9,      // From geofence working hours
  actualHours: 8.5,      // Calculated from check-in/out
  duration: 510,         // In minutes
  checkIn: {
    time: "2025-12-20T09:00:00.000Z",
    geofence: ObjectId("...") // Reference to geofence
  },
  checkOut: {
    time: "2025-12-20T17:30:00.000Z",
    geofence: ObjectId("...") // Reference to geofence
  }
}
```

## Configuration Examples

### Standard Office Hours
```json
{
  "name": "Main Office",
  "workingHours": {
    "start": "09:00",
    "end": "18:00"
  },
  "checkInTime": {
    "expectedTime": "09:00",
    "gracePeriodMinutes": 15
  }
}
```
- Expected check-in: 9:00 AM
- Grace period: Until 9:15 AM
- Working hours: 9:00 AM - 6:00 PM (9 hours)
- Late after: 9:15 AM

### Flexible Hours
```json
{
  "name": "Tech Department",
  "workingHours": {
    "start": "10:00",
    "end": "19:00"
  },
  "checkInTime": {
    "expectedTime": "10:00",
    "gracePeriodMinutes": 30
  }
}
```
- Expected check-in: 10:00 AM
- Grace period: Until 10:30 AM
- Working hours: 10:00 AM - 7:00 PM (9 hours)
- Late after: 10:30 AM

### Shift Work
```json
{
  "name": "Production Floor - Morning Shift",
  "workingHours": {
    "start": "06:00",
    "end": "14:00"
  },
  "checkInTime": {
    "expectedTime": "06:00",
    "gracePeriodMinutes": 5
  }
}
```
- Expected check-in: 6:00 AM
- Grace period: Until 6:05 AM
- Working hours: 6:00 AM - 2:00 PM (8 hours)
- Late after: 6:05 AM

## Status Calculations

### Present Status
- Check-in: Within grace period
- Working: Full expected hours
```
Check-in: 9:10 AM (within 9:15 grace)
Check-out: 6:00 PM
Actual hours: 8.83 hours
Status: Present ✓
```

### Late Status
- Check-in: After grace period
- Working: Can still complete full hours
```
Check-in: 9:25 AM (after 9:15 grace)
Check-out: 6:00 PM
Actual hours: 8.58 hours
Status: Late ⚠️
Late by: 25 minutes
```

### Half-Day Status
- Check-in: Any time
- Working: Less than 50% of expected hours
```
Check-in: 9:00 AM
Check-out: 1:00 PM
Actual hours: 4 hours (< 4.5 required)
Status: Half-Day 📅
```

## Display in Apps

### Mobile App - Attendance History
```
Date: Dec 20, 2025
Status: Present ✓
Check-in: 9:05 AM
Check-out: 6:10 PM
Duration: 9h 5m
Expected: 9h (from geofence)
Actual: 9.08h
```

### Admin Panel - Attendance Page
```
Employee    | Date       | Check-In | Check-Out | Duration | Expected | Status
------------|------------|----------|-----------|----------|----------|--------
John Doe    | 2025-12-20 | 9:05 AM  | 6:10 PM   | 9h 5m    | 9h       | Present
Jane Smith  | 2025-12-20 | 9:25 AM  | 6:00 PM   | 8h 35m   | 9h       | Late ⚠️
```

## API Response Examples

### Check-In Response
```json
{
  "success": true,
  "data": {
    "_id": "676554d8f9e8c0001234abcd",
    "user": "676554d8f9e8c0001234xyz1",
    "date": "2025-12-20T00:00:00.000Z",
    "checkIn": {
      "time": "2025-12-20T09:05:00.000Z",
      "location": {
        "type": "Point",
        "coordinates": [77.2090, 28.6139]
      },
      "geofence": "676554d8f9e8c0001234geo1"
    },
    "status": "present",
    "expectedHours": 9,
    "isLate": false,
    "lateBy": 0
  }
}
```

### Check-Out Response
```json
{
  "success": true,
  "data": {
    "_id": "676554d8f9e8c0001234abcd",
    "checkIn": {
      "time": "2025-12-20T09:05:00.000Z",
      "geofence": "676554d8f9e8c0001234geo1"
    },
    "checkOut": {
      "time": "2025-12-20T18:10:00.000Z",
      "geofence": "676554d8f9e8c0001234geo1"
    },
    "duration": 545,
    "expectedHours": 9,
    "actualHours": 9.08,
    "status": "present"
  }
}
```

## Testing Steps

### 1. Configure Geofence (Web Admin)
1. Login to admin panel
2. Go to **Geofences** page
3. Create/Edit geofence
4. Set **Working Hours**:
   - Start: 09:00
   - End: 18:00
5. Set **Check-In Time**:
   - Expected: 09:00
   - Grace: 15 minutes
6. Save geofence

### 2. Test Check-In (Mobile App)
1. Employee goes to geofence location
2. Checks in at 9:05 AM
3. **Verify**:
   - Status: Present
   - Expected hours: 9h
   - Late: No

### 3. Test Check-Out (Mobile App)
1. Employee checks out at 6:10 PM
2. **Verify**:
   - Duration: 9h 5m
   - Actual hours: 9.08h
   - Status: Present (completed full day)

### 4. Test Half-Day
1. Employee checks in at 9:00 AM
2. Checks out at 1:00 PM (4 hours)
3. **Verify**:
   - Actual hours: 4h
   - Expected hours: 9h
   - Status: Half-Day (< 50% of expected)

## Benefits

✅ **Flexible**: Different working hours per location
✅ **Automatic**: No manual configuration needed per employee
✅ **Accurate**: Calculates based on actual geofence settings
✅ **Transparent**: Employees see expected vs actual hours
✅ **Fair**: Grace period + working hours tailored to location

## Use Cases

### Multi-Location Company
```
Head Office: 9am - 6pm (9 hours)
Branch Office: 8am - 5pm (9 hours)
Warehouse: 7am - 4pm (9 hours)
```

### Shift-Based Work
```
Morning Shift: 6am - 2pm (8 hours)
Evening Shift: 2pm - 10pm (8 hours)
Night Shift: 10pm - 6am (8 hours)
```

### Department-Specific
```
Sales Team: 10am - 7pm (flexible 9 hours)
Operations: 9am - 6pm (standard 9 hours)
Support: 8am - 5pm (early 9 hours)
```

## Related Files
- Backend:
  - `backend/src/models/Geofence.js` - Working hours schema
  - `backend/src/routes/attendanceRoutes.js` - Check-in/out logic
  - `backend/src/models/Attendance.js` - Expected/actual hours storage

- Web Admin:
  - `web/src/pages/Geofences.jsx` - Working hours configuration
  - `web/src/pages/Attendance.jsx` - Hours display

- Mobile App:
  - `mobile/src/components/attendance/AttendanceCard.js` - Hours display
