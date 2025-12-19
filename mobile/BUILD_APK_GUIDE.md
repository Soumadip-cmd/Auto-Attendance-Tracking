# 🚀 Build Android APK with Custom Logo

## Quick Build Guide

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
# Use your Expo account or create one at expo.dev
```

### Step 3: Configure Build
```bash
cd mobile
eas build:configure
```

### Step 4: Build APK
```bash
# For production APK
eas build --platform android --profile production

# For preview/testing APK (faster)
eas build --platform android --profile preview
```

### Step 5: Download APK
- Build will appear in your terminal with a URL
- Go to https://expo.dev/accounts/[your-account]/projects/attendance-tracker/builds
- Download the APK when ready

## 📋 What's Included in the APK

✅ **immigration.png** as app icon  
✅ **Beautiful animated splash screen**  
✅ **All app functionality**  
✅ **Optimized bundle size**  

## 🎨 Splash Screen Features

The custom splash screen includes:
- **Fade-in animation** (1 second)
- **Scale/zoom effect** with spring physics
- **Pulse animation** on logo
- **Animated background circles** (continuous loop)
- **Smooth text transitions**
- **Loading dots indicator**
- **Professional design** with shadows and effects

## 📱 App Icon Specifications

Your `immigration.png` is configured for:
- **Android**: Adaptive icon with #6366f1 background
- **iOS**: Standard app icon
- **Splash screen**: Center-positioned with animations

## ⚡ Quick Commands

```bash
# Start development server
npm start

# Run on Android device/emulator
npx expo run:android

# Build APK (local)
npx expo run:android --variant release

# Build with EAS (cloud)
eas build -p android --profile preview
```

## 🔧 Troubleshooting

### APK size too large?
Edit `app.json` and add:
```json
"expo": {
  "android": {
    "enableProguardInReleaseBuilds": true,
    "enableShrinkResourcesInReleaseBuilds": true
  }
}
```

### Splash screen not showing?
1. Clear cache: `npx expo start --clear`
2. Rebuild app
3. Check `app/_layout.js` for `showAnimatedSplash` state

### Icon not appearing?
1. Verify `src/assets/immigration.png` exists
2. Run `npx expo prebuild --clean`
3. Rebuild the app

## 📖 Build Profiles

Create `eas.json` in mobile folder for custom profiles:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

## ✨ Testing the Splash Screen

Run the app and you'll see:
1. Logo fades in smoothly
2. Background circles pulse
3. Logo scales up with spring effect
4. Logo pulses (zoom in/out)
5. Text slides up
6. Everything fades out
7. App loads

**Total duration**: ~3.7 seconds

## 🎯 Next Steps

1. ✅ Logo configured
2. ✅ Splash screen animated
3. 📦 Build APK with EAS
4. 📱 Test on device
5. 🚀 Distribute to users

Your app is ready to build! 🎉
