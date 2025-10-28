@echo off
echo ========================================
echo Installing All Dependencies...
echo ========================================

echo.
echo [1/2] Installing Backend Dependencies...
cd /d "e:\Hoistinger Server\Auto-Attendance-Tracking\backend"

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate and install
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo [2/2] Installing Frontend Dependencies...
cd /d "e:\Hoistinger Server\Auto-Attendance-Tracking\frontend"
npm install

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo You can now run:
echo   - start-backend.bat (to start backend)
echo   - start-frontend.bat (to start frontend)
echo.
pause
