@echo off
cls
echo ================================================
echo     ATTENDANCE TRACKING - COMPLETE RESTART
echo ================================================
echo.
echo This script will:
echo 1. Stop all running servers
echo 2. Clear Metro bundler cache
echo 3. Restart backend server
echo 4. Restart frontend with clean cache
echo.
echo Press any key to continue...
pause > nul

echo.
echo [1/4] Stopping any running servers...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM python.exe 2>nul
timeout /t 2 > nul

echo.
echo [2/4] Starting Backend Server...
cd /d "%~dp0backend"
start "Backend Server" cmd /k "uvicorn server:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 > nul

echo.
echo [3/4] Clearing Metro bundler cache...
cd /d "%~dp0tracking"
rmdir /s /q .metro-cache-new 2>nul
rmdir /s /q node_modules\.cache 2>nul

echo.
echo [4/4] Starting Tracking App...
echo.
echo ================================================
echo   IMPORTANT: After the app starts
echo ================================================
echo   1. Look for: "Press s | switch to Expo Go"
echo   2. Press 's' key to switch to Expo Go mode
echo   3. Scan the QR code with Expo Go app
echo ================================================
echo.
timeout /t 3 > nul

npx expo start --clear

pause
