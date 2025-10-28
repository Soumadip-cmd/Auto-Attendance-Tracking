@echo off
echo ============================================
echo Starting Tracking App (Development Build)
echo ============================================
echo.
echo IMPORTANT: Make sure backend is running!
echo Backend should be at: http://192.168.31.103:8000
echo.
echo After the app starts:
echo 1. Press 's' to switch to Expo Go mode
echo 2. Then scan the QR code with Expo Go app
echo.
pause

cd /d "%~dp0tracking"

echo.
echo Clearing Metro cache...
npx expo start --clear

pause
