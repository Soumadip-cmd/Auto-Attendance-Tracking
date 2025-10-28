# 🔧 CONNECTION TROUBLESHOOTING GUIDE

## ✅ What I Fixed

### 1. **Added XHR adapter to api.ts**
   - React Native cannot use Node.js modules like `follow-redirects`
   - Added `adapter: 'xhr'` to force React Native compatibility

### 2. **Created metro.config.js**
   - Blocks `follow-redirects` module that causes connection errors
   - Ensures Metro bundler handles React Native properly

### 3. **Added fallback URL**
   - If .env doesn't load, falls back to `http://192.168.31.103:8000`

## 📱 How to Fix Your Connection Error

### **STEP 1: Stop the current Metro bundler**
In the terminal where `npm start` is running, press **Ctrl+C** to stop it.

### **STEP 2: Clear cache and restart**
Run this command in the tracking folder:
```powershell
cd "E:\Hoistinger Server\Auto-Attendance-Tracking\tracking"
npx expo start --clear
```

Or simply run the batch file:
```powershell
start-tracking.bat
```

### **STEP 3: Switch to Expo Go mode**
When the app starts:
1. Look for the message: `› Press s │ switch to Expo Go`
2. Press the **`s`** key on your keyboard
3. The QR code will change to Expo Go format

### **STEP 4: Scan with Expo Go app**
Open **Expo Go** app on your phone and scan the NEW QR code.

## 🔍 Why the Error Happened

Your error: `java.net.ConnectException: Failed to connect to /192.168.31.103:8081`

**Root Causes:**
1. ❌ You were using **Development Build** QR code, but don't have the development client APK installed
2. ❌ Axios was trying to use Node.js modules (`follow-redirects`) which don't exist in React Native
3. ❌ Metro bundler cached old configuration without XHR adapter

## ✨ Development Build vs Expo Go

### **Expo Go** (What you want to use now)
- ✅ No installation needed
- ✅ Just scan QR code
- ✅ Works immediately
- ⚠️ Limited to Expo SDK modules only

### **Development Build** (What you were trying)
- ❌ Requires building and installing APK first
- ❌ Need to run: `eas build --profile development`
- ❌ Takes time to build and install
- ✅ Can use any native module

## 🚀 Quick Start Commands

### Start Backend (if not running):
```powershell
cd "E:\Hoistinger Server\Auto-Attendance-Tracking\backend"
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Start Tracking App:
```powershell
cd "E:\Hoistinger Server\Auto-Attendance-Tracking\tracking"
npx expo start --clear
```

Then press **`s`** to switch to Expo Go!

## 🔥 Windows Firewall Check

If still not connecting, allow ports through firewall:
```powershell
netsh advfirewall firewall add rule name="Expo Dev Server" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=8000
```

## 📊 Verify Everything is Working

### 1. Check Backend:
Open browser: `http://192.168.31.103:8000/docs`
You should see the API documentation.

### 2. Check Frontend:
After `npm start`, look for:
```
Metro waiting on exp://192.168.31.103:8081
```

### 3. Check WiFi:
- Phone and PC must be on **same WiFi network**
- No VPN should be active
- No firewall blocking

## 🎯 Summary

**What to do NOW:**
1. Stop current server (Ctrl+C)
2. Run: `npx expo start --clear` in tracking folder
3. Press **`s`** key to switch to Expo Go
4. Scan QR code with Expo Go app
5. ✨ App should load!

**Files Fixed:**
- ✅ `tracking/app/utils/api.ts` - Added XHR adapter
- ✅ `tracking/metro.config.js` - Created to block Node.js modules
- ✅ `start-tracking.bat` - Easy startup script

## 🆘 Still Not Working?

1. **Check both servers are running:**
   - Backend on port 8000 ✅
   - Frontend on port 8081 ⏳

2. **Verify IP address:**
   ```powershell
   ipconfig
   ```
   Should show: `192.168.31.103`

3. **Test backend from phone browser:**
   Open: `http://192.168.31.103:8000/docs`
   If this doesn't work, firewall is blocking!

4. **Restart phone's WiFi**
   Sometimes helps with connectivity issues.

---

**Good luck! 🚀 Your app should work now!**
