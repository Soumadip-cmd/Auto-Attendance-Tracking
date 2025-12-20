# EAS Update Guide - Easy App Updates 🚀

## Overview
EAS (Expo Application Services) allows you to push Over-The-Air (OTA) updates to your app without rebuilding and redistributing.

## Setup Complete ✅
- EAS configuration with channels (preview, production)
- Auto-update check on app launch
- Detailed console logging for tracking
- Auto-increment version numbers

---

## Quick Commands

### 1. **Push Update to Preview Channel**
```bash
cd mobile
eas update --channel preview --message "Bug fixes and improvements"
```

### 2. **Push Update to Production Channel**
```bash
cd mobile
eas update --channel production --message "New features released"
```

### 3. **Check Update Status**
```bash
eas update:list
```

### 4. **View Update Details**
```bash
eas update:view [update-id]
```

---

## Workflow

### Development → Preview → Production

#### Step 1: Make Changes
```bash
# Edit your code
# mobile/app/(tabs)/history.js
# mobile/src/services/geofenceService.js
# etc.
```

#### Step 2: Test Locally
```bash
cd mobile
npm start
# Test on Expo Go or development build
```

#### Step 3: Push to Preview
```bash
eas update --channel preview --message "Testing new history tab fixes"
```

#### Step 4: Test Preview
- Users on preview channel will auto-receive update on next app launch
- Check console logs:
  ```
  📱 APP LAUNCHED - Starting initialization
  🔍 Checking for updates...
  📥 New update available! Downloading...
  ✅ Update downloaded. Reloading app...
  ```

#### Step 5: Push to Production
```bash
eas update --channel production --message "History tab improvements - v1.2.0"
```

---

## Build New APK (When Needed)

### Preview APK (for testing)
```bash
eas build --platform android --profile preview
```

### Production Bundle (for Play Store)
```bash
eas build --platform android --profile production
```

---

## Console Logs Explained

### App Launch
```
📱 APP LAUNCHED - Starting initialization
📦 Updates Channel: preview
🔄 Runtime Version: 1.0.0
🆔 Update ID: abc123...
```

### Update Check
```
🔍 Checking for updates...
📥 New update available! Downloading...
✅ Update downloaded. Reloading app...
```
OR
```
🔍 Checking for updates...
✅ App is up to date
```

### Auth Flow
```
🔐 Auth State Changed: {
  isAuthenticated: true,
  authLoading: false,
  currentSegment: "(tabs)",
  inAuthGroup: false
}
➡️ Redirecting to main app...
```

### Geofence Monitoring
```
📍 Loaded 1 geofences
🏢 Geofence: FIEM at 22.8268628, 88.3910227, radius: 100m
📍 Checking location: {lat: 22.8268628, lng: 88.3910227, accuracy: 20}
📏 Distance to geofences:
  FIEM: 5.50m away (radius: 100m) ✅ INSIDE
🔵 Entered geofence: FIEM
✅ Auto check-in triggered
```

---

## Update Channels

### Preview
- For internal testing
- All team members
- Frequent updates

### Production
- For end users
- Stable releases only
- Tested features

---

## When to Use Updates vs Builds

### Use Updates (OTA) for:
✅ Bug fixes
✅ UI changes
✅ Text updates
✅ Logic changes
✅ Feature improvements

### Use Builds (New APK/Bundle) for:
❌ Native module changes
❌ Version upgrades (Expo SDK)
❌ New permissions
❌ App config changes (app.json)
❌ Major releases

---

## Common Commands

### View Channels
```bash
eas channel:list
```

### Create New Channel
```bash
eas channel:create [channel-name]
```

### Rollback Update
```bash
eas update:rollback --channel production
```

### Delete Update
```bash
eas update:delete [update-id]
```

---

## Troubleshooting

### Update Not Appearing
1. Check channel: `eas update:list`
2. Force reload app (close completely and reopen)
3. Clear app data and relaunch

### Update Failed
1. Check console logs for errors
2. Verify internet connection
3. Check EAS status: `eas whoami`

### Too Many Updates
- Use meaningful commit messages
- Group related changes
- Test thoroughly before pushing

---

## Best Practices

1. **Always test in preview first**
2. **Use descriptive update messages**
3. **Monitor console logs**
4. **Keep runtime version consistent**
5. **Don't push broken code to production**
6. **Increment version in package.json for major changes**

---

## Example Workflow Session

```bash
# Morning: Fix bug
cd mobile
npm start
# Test fix works

# Push to preview
eas update --channel preview --message "Fixed late time display bug"

# Afternoon: Test on device
# App auto-updates, check logs
# Verify fix works

# Evening: Push to production
eas update --channel production --message "v1.2.1 - Bug fixes"
```

---

## Auto-Update Behavior

**When app launches:**
1. Checks for updates in background
2. Downloads if available
3. Reloads app automatically
4. User sees updated version

**User sees:**
- Brief loading screen during update
- Console logs (in development)
- Updated app features immediately

---

## Version Tracking

### package.json
```json
{
  "version": "1.2.0"
}
```

### Update Message Format
```
v[version] - [description]
```

Example:
```bash
eas update --message "v1.2.0 - Added history tab, fixed time display"
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `eas update --channel preview` | Test update |
| `eas update --channel production` | Live update |
| `eas update:list` | View all updates |
| `eas build --profile preview` | Build APK |
| `eas build --profile production` | Build bundle |

---

🎉 **You're all set! Push updates with confidence!**
