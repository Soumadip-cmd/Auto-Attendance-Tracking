@echo off
echo ========================================
echo Starting Backend Server...
echo ========================================
cd /d "e:\Hoistinger Server\Auto-Attendance-Tracking\backend"

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start the server
echo.
echo Backend server starting at http://localhost:8000
echo API Documentation at http://localhost:8000/docs
echo.
uvicorn server:app --reload --host 0.0.0.0 --port 8000

pause
