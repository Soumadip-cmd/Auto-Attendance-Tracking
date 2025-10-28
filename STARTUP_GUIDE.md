# Auto-Attendance Tracking System - Startup Guide

## Prerequisites
- Python 3.9+ installed
- Node.js 18+ installed
- MongoDB connection string configured

## Backend Setup & Start

### 1. Navigate to backend folder
```powershell
cd "e:\Hoistinger Server\Auto-Attendance-Tracking\backend"
```

### 2. Create virtual environment (first time only)
```powershell
python -m venv venv
```

### 3. Activate virtual environment
```powershell
.\venv\Scripts\Activate.ps1
```

If you get an execution policy error, run this first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 4. Install dependencies (first time only)
```powershell
pip install -r requirements.txt
```

### 5. Start the backend server
```powershell
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The backend will be running at: **http://localhost:8000**

---

## Frontend Setup & Start

### 1. Open a NEW terminal and navigate to frontend folder
```powershell
cd "e:\Hoistinger Server\Auto-Attendance-Tracking\frontend"
```

### 2. Install dependencies (first time only)
```powershell
npm install
# OR
yarn install
```

### 3. Start the Expo development server
```powershell
npm start
# OR
yarn start
# OR
npx expo start
```

### 4. Choose your platform:
- Press **`a`** for Android emulator
- Press **`i`** for iOS simulator
- Press **`w`** for web browser
- Scan QR code with Expo Go app on your phone

---

## Quick Start Commands (Copy-Paste)

### Start Backend (Terminal 1):
```powershell
cd "e:\Hoistinger Server\Auto-Attendance-Tracking\backend"; .\venv\Scripts\Activate.ps1; uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Start Frontend (Terminal 2):
```powershell
cd "e:\Hoistinger Server\Auto-Attendance-Tracking\frontend"; npm start
```

---

## Environment Configuration

### Backend (.env)
```
MONGO_URL=mongodb+srv://solvitwbjee:mDD8Mh91XSenCatS@soivit.nqnpubn.mongodb.net/gyanoda-v2?retryWrites=true&w=majority
DB_NAME=attendance_tracking
PORT=8000
```

### Frontend (.env)
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## Troubleshooting

### Backend Issues:
1. **Module not found**: Run `pip install -r requirements.txt`
2. **Port already in use**: Kill the process or use different port
3. **MongoDB connection error**: Check MONGO_URL in .env

### Frontend Issues:
1. **Cannot find module**: Run `npm install` or `yarn install`
2. **AuthContext error**: File is now created at `app/context/AuthContext.tsx`
3. **Backend connection error**: Make sure backend is running on port 8000

---

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Classes
- POST `/api/class/create` - Create new class
- GET `/api/class/list` - List all classes
- GET `/api/class/{class_id}` - Get class details

### Attendance
- POST `/api/attendance/mark` - Mark attendance
- GET `/api/attendance/student/{student_id}` - Get student attendance
- GET `/api/attendance/class/{class_id}` - Get class attendance

### Admin
- GET `/api/admin/dashboard` - Admin dashboard stats
- GET `/api/admin/users` - List all users

---

## Default Test Accounts

After starting the backend, you can register accounts with these roles:
- **Student**: role = "student"
- **Teacher**: role = "teacher"  
- **Admin**: role = "admin"

---

## Project Structure

```
Auto-Attendance-Tracking/
├── backend/
│   ├── server.py          # FastAPI backend server
│   ├── requirements.txt   # Python dependencies
│   └── .env              # Backend environment variables
│
├── frontend/
│   ├── app/
│   │   ├── context/
│   │   │   └── AuthContext.tsx  # Authentication context
│   │   └── screens/      # App screens
│   ├── package.json      # Node dependencies
│   └── .env             # Frontend environment variables
│
└── client/               # Original React Native client
```

---

## Notes

- Backend runs on port **8000**
- Frontend development server runs on port **8081** (Expo default)
- Make sure both servers are running simultaneously
- MongoDB connection is already configured
- AuthContext has been created to fix the import error

---

## Need Help?

Check the logs in both terminals for error messages. Most issues are due to:
1. Missing dependencies (run install commands)
2. Backend not running (start backend first)
3. Wrong environment variables (check .env files)
