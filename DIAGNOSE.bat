@echo off
cls
echo ================================================
echo     CONNECTION DIAGNOSTIC TOOL
echo ================================================
echo.

echo [1] Checking IP Address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set IP=%%a
    set IP=!IP: =!
    echo    Your PC IP: !IP!
)
echo.

echo [2] Checking Backend Port 8000...
netstat -an | findstr "0.0.0.0:8000" >nul
if %errorlevel%==0 (
    echo    ✅ Backend is LISTENING on port 8000
) else (
    echo    ❌ Backend is NOT running on port 8000
    echo    ACTION: Start backend first!
)
echo.

echo [3] Checking Frontend Port 8081...
netstat -an | findstr ":8081" >nul
if %errorlevel%==0 (
    echo    ✅ Frontend is LISTENING on port 8081
) else (
    echo    ⚠️  Frontend is NOT running on port 8081
)
echo.

echo [4] Testing Backend Connection...
curl -s http://localhost:8000/docs >nul 2>&1
if %errorlevel%==0 (
    echo    ✅ Backend responds to requests
) else (
    echo    ❌ Backend is not responding
)
echo.

echo [5] Checking .env file...
if exist "tracking\.env" (
    echo    ✅ .env file exists
    type "tracking\.env"
) else (
    echo    ❌ .env file is MISSING!
)
echo.

echo [6] Checking Firewall Rules...
netsh advfirewall firewall show rule name="Expo Dev Server" >nul 2>&1
if %errorlevel%==0 (
    echo    ✅ Expo firewall rule exists
) else (
    echo    ⚠️  Expo firewall rule NOT found
    echo    Run: netsh advfirewall firewall add rule name="Expo Dev Server" dir=in action=allow protocol=TCP localport=8081
)
echo.

netsh advfirewall firewall show rule name="Backend API" >nul 2>&1
if %errorlevel%==0 (
    echo    ✅ Backend firewall rule exists
) else (
    echo    ⚠️  Backend firewall rule NOT found
    echo    Run: netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=8000
)
echo.

echo ================================================
echo     TROUBLESHOOTING STEPS
echo ================================================
echo.
echo IF BACKEND NOT RUNNING:
echo   cd backend
echo   uvicorn server:app --reload --host 0.0.0.0 --port 8000
echo.
echo IF FRONTEND NOT CONNECTING:
echo   1. Stop current server (Ctrl+C)
echo   2. cd tracking
echo   3. npx expo start --clear
echo   4. Press 's' to switch to Expo Go
echo   5. Scan QR code with Expo Go app
echo.
echo IF PHONE STILL CANT CONNECT:
echo   1. Check phone and PC on same WiFi
echo   2. Disable VPN if active
echo   3. Add firewall rules (see above)
echo   4. Test backend from phone browser:
echo      http://192.168.31.103:8000/docs
echo.
pause
