@echo off
echo ========================================
echo Starting Frontend (Expo)...
echo ========================================
cd /d "e:\Hoistinger Server\Auto-Attendance-Tracking\frontend"

REM Start Expo
echo.
echo Starting Expo development server...
echo Press 'a' for Android, 'i' for iOS, 'w' for Web
echo.
npm start

pause
