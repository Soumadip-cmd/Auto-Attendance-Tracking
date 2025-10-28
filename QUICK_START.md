# 🚀 Quick Start Commands

## ✅ FIXED ISSUES:
1. ✅ Backend `.env` file corrected (removed quotes from MongoDB URL)
2. ✅ Created missing `AuthContext.tsx` file
3. ✅ Frontend `.env` updated to point to `http://localhost:8000`
4. ✅ Created easy startup scripts

---

## 🎯 OPTION 1: Quick Start (Recommended)

### Step 1: Install Dependencies (First Time Only)
Double-click: **`install-dependencies.bat`**

### Step 2: Start Backend (Terminal 1)
Double-click: **`start-backend.bat`**
- Backend will start at: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Step 3: Start Frontend (Terminal 2)
Double-click: **`start-frontend.bat`**
- Expo will open in browser
- Press `a` for Android, `w` for Web

---

## 🎯 OPTION 2: Manual Commands

### Backend Commands:
```powershell
# Navigate to backend folder
cd "e:\Hoistinger Server\Auto-Attendance-Tracking\backend"

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start backend server
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Commands (in new terminal):
```powershell
# Navigate to frontend folder
cd "e:\Hoistinger Server\Auto-Attendance-Tracking\frontend"

# Start frontend
npm start
# OR
npx expo start
```

---

## 🎯 OPTION 3: One-Line Commands

### Backend (Copy & Paste in PowerShell):
```powershell
cd "e:\Hoistinger Server\Auto-Attendance-Tracking\backend"; .\venv\Scripts\Activate.ps1; uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (Copy & Paste in new PowerShell):
```powershell
cd "e:\Hoistinger Server\Auto-Attendance-Tracking\frontend"; npm start
```

---

## 📱 Testing the App

### Web Browser:
1. Start both backend and frontend
2. In Expo terminal, press `w`
3. App opens in browser at http://localhost:8081

### Mobile Device:
1. Install "Expo Go" app from Play Store/App Store
2. Scan QR code from Expo terminal
3. Make sure your phone and PC are on same WiFi

### Android Emulator:
1. Have Android Studio emulator running
2. Press `a` in Expo terminal

---

## 🔧 Environment Files

### Backend `.env` (Already Fixed ✅)
```env
MONGO_URL=mongodb+srv://solvitwbjee:mDD8Mh91XSenCatS@soivit.nqnpubn.mongodb.net/gyanoda-v2?retryWrites=true&w=majority
DB_NAME=attendance_tracking
PORT=8000
```

### Frontend `.env` (Already Fixed ✅)
```env
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## 📚 API Documentation

Once backend is running, visit:
**http://localhost:8000/docs**

You'll see interactive Swagger UI with all API endpoints!

---

## 🐛 Troubleshooting

### ❌ "Cannot find module AuthContext"
**FIXED!** ✅ The file has been created at:
`frontend/app/context/AuthContext.tsx`

### ❌ Backend won't start
```powershell
# Make sure virtual environment is activated
cd backend
.\venv\Scripts\Activate.ps1

# Reinstall dependencies
pip install -r requirements.txt

# Try again
uvicorn server:app --reload --port 8000
```

### ❌ Frontend shows connection error
- Make sure backend is running at http://localhost:8000
- Check backend terminal for errors
- Visit http://localhost:8000/docs to verify backend is up

### ❌ "Execution Policy" error in PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ❌ Port 8000 already in use
```powershell
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

---

## 🎨 Project Structure

```
Auto-Attendance-Tracking/
│
├── 📂 backend/
│   ├── server.py              # FastAPI backend
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Backend config ✅ FIXED
│
├── 📂 frontend/
│   ├── app/
│   │   ├── context/
│   │   │   └── AuthContext.tsx  ✅ CREATED
│   │   └── screens/           # App screens
│   ├── package.json
│   └── .env                   # Frontend config ✅ FIXED
│
├── start-backend.bat          ✅ NEW - Easy backend start
├── start-frontend.bat         ✅ NEW - Easy frontend start
├── install-dependencies.bat   ✅ NEW - Install everything
└── QUICK_START.md            ✅ NEW - This file
```

---

## 🎯 Common Workflows

### First Time Setup:
1. Run `install-dependencies.bat`
2. Run `start-backend.bat`
3. Run `start-frontend.bat` (in new terminal)

### Daily Development:
1. Run `start-backend.bat`
2. Run `start-frontend.bat` (in new terminal)

### Just Backend Testing:
1. Run `start-backend.bat`
2. Visit http://localhost:8000/docs
3. Test APIs directly in Swagger UI

---

## 📖 API Endpoints Quick Reference

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Classes
- `POST /api/class/create` - Create class (Teacher/Admin)
- `GET /api/class/list` - List all classes
- `GET /api/class/{id}` - Get class details

### Attendance
- `POST /api/attendance/mark` - Mark attendance (Student)
- `GET /api/attendance/student/{id}` - Get student attendance
- `GET /api/attendance/class/{id}` - Get class attendance

### Admin
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - List all users

---

## ✅ What Was Fixed

1. **Backend .env**: Removed quotes from MongoDB URL
2. **Frontend .env**: Changed backend URL to localhost:8000
3. **AuthContext**: Created missing context file with full auth logic
4. **Startup Scripts**: Created 3 batch files for easy startup
5. **Documentation**: Created comprehensive startup guides

---

## 🎉 You're All Set!

Your app is ready to run! Just:
1. Double-click `start-backend.bat`
2. Double-click `start-frontend.bat`
3. Start coding! 🚀

For detailed documentation, see `STARTUP_GUIDE.md`
