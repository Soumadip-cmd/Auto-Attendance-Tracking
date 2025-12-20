# Quick Testing Guide - Late Detection System

## Prerequisites
✅ Backend server running on http://192.168.0.108:5000
✅ Admin account: admin@example.com / Admin@123
✅ MongoDB connected
✅ Mobile app with correct API_URL

## Testing Steps

### Phase 1: Configure Geofence (5 minutes)

1. **Open Web Admin Panel**
   - Navigate to: http://localhost:5173 (or your web port)
   - Login as admin

2. **Create Test Geofence**
   - Go to **Geofences** page
   - Click **Add Geofence**
   - Fill in:
     ```
     Name: Office Campus
     Description: Main office building
     Type: Campus
     Latitude: [Your location or test location]
     Longitude: [Your location or test location]
     Radius: 500 (meters)
     Address: Your office address
     
     Working Hours:
     - Start: 09:00
     - End: 18:00
     
     Check-In Settings: ⭐ NEW
     - Expected Check-In Time: 09:00
     - Grace Period: 15 minutes
     
     Alerts:
     - ✓ On Entry
     - ✓ On Exit
     
     Color: #4F46E5 (blue)
     Active: ✓ Yes
     ```
   - Click **Create Geofence**

3. **Verify Geofence Created**
   - Should see geofence in list
   - Check map shows the location
   - Edit to verify settings are saved

### Phase 2: Test Check-In Scenarios (15 minutes)

#### Scenario A: On-Time Check-In (Before Expected Time)
**Simulate Time:** Before 09:00 (or modify system time for testing)

1. Open mobile app
2. Go to **Home** tab
3. Ensure location is **within geofence radius**
4. Click **Check In**
5. **Expected Result:**
   - ✅ Status: "Present"
   - ✅ Green badge/checkmark icon
   - ✅ No "Late" label

#### Scenario B: Within Grace Period
**Simulate Time:** Between 09:00 and 09:15

1. Check in using mobile app
2. **Expected Result:**
   - ✅ Status: "Present"
   - ✅ Treated as on-time (within grace period)

#### Scenario C: Late Check-In
**Simulate Time:** After 09:15 (e.g., 09:20, 09:30)

1. Check in using mobile app
2. **Expected Result:**
   - ⚠️ Status: "Late"
   - ⚠️ Yellow badge/clock icon
   - ⚠️ "Late" label visible
   - ⚠️ `lateBy` field shows minutes late

### Phase 3: Verify Display (10 minutes)

#### Mobile App - Attendance History
1. Go to **Attendance** tab
2. Check today's record
3. **Verify:**
   - Status badge shows correct color
     - Green = Present
     - Yellow = Late
   - Icon shows correct symbol
     - ✓ = Present
     - 🕐 = Late
   - Statistics show late count

#### Web Admin - Attendance Page
1. Login to web admin
2. Go to **Attendance** page
3. **Verify:**
   - Late records have **yellow badge**
   - Badge text shows "late"
   - Can filter by "Late" status
   - Dark mode shows appropriate colors

#### Web Admin - Dashboard
1. Go to **Dashboard**
2. Check **Recent Activity** section
3. **Verify:**
   - Late check-ins show **"Late" badge** next to name
   - Badge has yellow background
   - Activity shows employee name + late indicator

### Phase 4: Advanced Testing (Optional)

#### Test Different Grace Periods
1. Edit geofence
2. Change grace period to 5 minutes
3. Test check-in at:
   - 09:03 → Should be Present
   - 09:07 → Should be Late

#### Test Multiple Geofences
1. Create second geofence with different time:
   ```
   Expected Time: 13:00
   Grace Period: 20 minutes
   ```
2. Check in at each location
3. Verify correct time settings are used

#### Test Outside Geofence (Default Behavior)
1. Check in outside all geofences
2. Should use default: 09:00 + 15min grace
3. Status based on default threshold

### Phase 5: Data Verification (5 minutes)

#### MongoDB Check (Optional)
```javascript
// Connect to MongoDB
db.attendances.find({ 
  status: 'late' 
}).sort({ 'checkIn.time': -1 }).limit(5)

// Should show:
// - status: 'late'
// - isLate: true
// - lateBy: <number of minutes>
// - checkIn.geofence: <geofence ObjectId>
```

#### API Check
```bash
# Get user's attendance history
curl -X GET "http://192.168.0.108:5000/api/v1/attendance/history" \
  -H "Authorization: Bearer <your_token>"

# Should return records with:
# "status": "late"
# "isLate": true
# "lateBy": 20
```

## Troubleshooting Checklist

### Issue: Late detection not working
- [ ] Geofence has `checkInTime.expectedTime` set?
- [ ] Geofence is active (`isActive: true`)?
- [ ] Employee location is within geofence radius?
- [ ] Backend server time is correct?
- [ ] Check-in time format is "HH:mm" (e.g., "09:00")?

### Issue: Status showing as Present when should be Late
- [ ] Current time is **after** expected time + grace period?
- [ ] Grace period configured correctly (default 15)?
- [ ] Check backend logs for calculation
- [ ] Verify time zone settings

### Issue: Mobile app not showing Late badge
- [ ] Check API response has `status: 'late'`
- [ ] AttendanceCard component is rendering
- [ ] Theme colors defined for warning state
- [ ] App has latest code changes

### Issue: Admin panel not highlighting Late
- [ ] `getStatusBadge()` function includes 'late' case
- [ ] Yellow/warning Tailwind classes available
- [ ] Recent activity API returning status field
- [ ] Dashboard component updated with late badge

## Success Criteria

✅ **Backend:**
- Geofence has checkInTime field with expectedTime and gracePeriodMinutes
- Check-in route calculates late status correctly
- Attendance record stores status, isLate, lateBy, and geofence reference

✅ **Web Admin:**
- Can configure check-in time and grace period per geofence
- Attendance page shows late status with yellow badge
- Dashboard recent activity shows "Late" label for late check-ins
- Dark mode colors work properly

✅ **Mobile App:**
- Attendance history shows late status with warning color
- Clock icon displays for late entries
- Statistics count late arrivals correctly
- Badge displays prominently

✅ **Data Integrity:**
- Late status persists in database
- Historical records maintain late status
- Reports and analytics include late data
- Filtering and sorting work correctly

## Next Steps After Testing

1. **Collect Feedback**
   - Do employees understand the grace period?
   - Is the late threshold appropriate?
   - Are notifications needed?

2. **Fine-Tune Settings**
   - Adjust grace periods per location
   - Different times for different geofences
   - Weekend/holiday considerations

3. **Add Reporting**
   - Weekly late report
   - Late trend analysis
   - Employee late patterns

4. **Notifications** (Future)
   - Alert admin when employee is late
   - Notify employee approaching late threshold
   - Daily late summary

## Quick Commands

```bash
# Start backend
cd backend
npm run dev

# Start web admin
cd web
npm run dev

# Start mobile app
cd mobile
npx expo start

# Check backend logs
cd backend/logs
cat exceptions.log

# Test API endpoint
curl http://192.168.0.108:5000/api/v1/attendance/stats

# MongoDB query
mongosh "mongodb+srv://cluster1.sg4xy3i.mongodb.net" --username <user>
```

## Support
- Backend Logs: `backend/logs/exceptions.log`
- Documentation: `LATE_DETECTION_GUIDE.md`
- API Documentation: `docs/API.md`
