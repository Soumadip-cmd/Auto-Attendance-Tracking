# Local Development Setup Guide

This guide will help you set up and run the Auto Attendance Tracking System locally.

## Prerequisites

Ensure you have the following installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **MongoDB** ([Download](https://www.mongodb.com/try/download/community)) or MongoDB Atlas account
- **Git** ([Download](https://git-scm.com/))
- **Expo CLI** (`npm install -g expo-cli`)
- **iOS Simulator** (Mac only) or **Android Emulator**

## Quick Start

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd AutoAttendanceTracking
```

### 2. Install Dependencies

```bash
# Install root dependencies (optional, for monorepo management)
npm install

# Install backend dependencies
cd backend
npm install

# Install mobile dependencies
cd ../mobile
npm install

cd ..
```

### 3. Setup MongoDB

**Option A: Local MongoDB**
```bash
# Start MongoDB
mongod --dbpath ./data

# Create directory if it doesn't exist
mkdir -p data
```

**Option B: MongoDB Atlas**
1. Create free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Get connection string
3. Use it in next step

### 4. Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
```env
NODE_ENV=development
PORT=5000
API_VERSION=v1

# For local MongoDB
MONGODB_URI=mongodb://localhost:27017/attendance_tracking

# Or for MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance_tracking

JWT_SECRET=dev-jwt-secret-key-change-in-production-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=dev-refresh-secret-key-change-in-production-min-32-chars
REFRESH_TOKEN_EXPIRES_IN=7d
LOCATION_SIGNATURE_SECRET=dev-location-signature-secret-key-min-32-chars

CORS_ORIGIN=http://localhost:19006,exp://localhost:19000,http://localhost:19000

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

LOCATION_HISTORY_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_DAYS=365

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@12345
```

### 5. Configure Mobile Environment

```bash
cd ../mobile
cp .env.example .env
```

Edit `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_WS_URL=http://localhost:5000

# For testing on physical device, replace localhost with your machine's IP
# Find your IP: ipconfig (Windows) or ifconfig (Mac/Linux)
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
# EXPO_PUBLIC_WS_URL=http://192.168.1.100:5000
```

### 6. Create Admin User

```bash
cd backend
npm run seed:admin
```

This creates an admin user with:
- Email: admin@example.com (or from .env)
- Password: Admin@12345 (or from .env)

### 7. Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
Server running in development mode on port 5000
MongoDB Connected: localhost
API available at http://localhost:5000/api/v1
```

### 8. Start Mobile App

Open a new terminal:

```bash
cd mobile
npm start
```

This will open Expo Dev Tools in your browser.

**Run on iOS Simulator:**
```bash
npm run ios
```

**Run on Android Emulator:**
```bash
npm run android
```

**Run on Physical Device:**
1. Install Expo Go app on your device
2. Scan QR code from Expo Dev Tools
3. Ensure device is on same network as your computer

## Testing the System

### 1. Test Backend API

**Using curl:**
```bash
# Health check
curl http://localhost:5000/api/v1/health

# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@12345"
  }'
```

**Using Postman:**
1. Import `docs/postman/AttendanceTracking.postman_collection.json`
2. Set `baseUrl` variable to `http://localhost:5000/api/v1`
3. Run "Login" request
4. Access token will be automatically saved

### 2. Test Mobile App

1. Launch the app
2. Login with admin@example.com / Admin@12345
3. Grant location permissions when prompted
4. Test check-in/check-out functionality

### 3. Test WebSocket Connection

**Using Browser Console:**
```javascript
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_ACCESS_TOKEN' }
});

socket.on('connected', (data) => {
  console.log('Connected:', data);
});

socket.on('location:update', (data) => {
  console.log('Location update:', data);
});
```

## Common Development Tasks

### Create Additional Users

**Via API:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "staff@example.com",
    "password": "Staff@12345",
    "firstName": "John",
    "lastName": "Doe",
    "role": "staff",
    "employeeId": "EMP001",
    "department": "Engineering"
  }'
```

### Create Geofences

```bash
curl -X POST http://localhost:5000/api/v1/geofences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Main Office",
    "type": "campus",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius": 200
  }'
```

### View Logs

**Backend logs:**
- Console output in terminal
- `backend/logs/combined.log`
- `backend/logs/error.log`

**Mobile logs:**
- Expo Dev Tools console
- Device console (React Native Debugger)

### Run Tests

```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
```

### Database Management

**View data:**
```bash
# Connect to MongoDB
mongosh attendance_tracking

# List collections
show collections

# Query users
db.users.find().pretty()

# Query attendance
db.attendances.find().pretty()
```

**Reset database:**
```bash
mongosh attendance_tracking --eval "db.dropDatabase()"
npm run seed:admin
```

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Find process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -i :5000
kill -9 <PID>

# Or change PORT in .env
```

**MongoDB connection failed:**
```bash
# Check if MongoDB is running
mongosh

# Start MongoDB if not running
mongod --dbpath ./data
```

**Module not found:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Mobile App Issues

**Metro bundler cache:**
```bash
cd mobile
npx expo start -c
```

**Location permissions not working:**
- iOS: Reset simulator: Device → Erase All Content and Settings
- Android: Go to App Settings → Permissions → Enable Location

**Can't connect to backend:**
1. Verify backend is running
2. Check API_URL in mobile/.env
3. Ensure device/emulator can reach your computer
4. Disable firewall temporarily to test

**Expo Go connection issues:**
1. Ensure phone and computer are on same WiFi
2. Try tunnel mode: `expo start --tunnel`
3. Check firewall settings

### WebSocket Issues

**Connection refused:**
1. Verify WS_URL is correct
2. Check CORS_ORIGIN includes your mobile URL
3. Ensure JWT token is valid

## Development Workflow

### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# Test locally

# Commit
git add .
git commit -m "Add: My feature description"

# Push
git push origin feature/my-feature

# Create Pull Request
```

### 2. Code Style

**Backend:**
```bash
cd backend
npm run lint        # Check issues
npm run lint:fix    # Auto-fix issues
```

**Mobile:**
```bash
cd mobile
npm run lint
```

### 3. Database Migrations

When schema changes:
1. Update models in `backend/src/models/`
2. Test locally
3. Document changes in migrations folder
4. Update seed scripts if needed

### 4. API Changes

When adding/modifying endpoints:
1. Update controller
2. Update routes
3. Add validation schema
4. Update API documentation
5. Update Postman collection
6. Add tests

## Performance Optimization Tips

### Backend
- Enable MongoDB indexes (already configured)
- Use Redis for caching (optional)
- Enable compression (already enabled)
- Monitor with `npm run dev` logs

### Mobile
- Use React.memo for expensive components
- Implement virtualized lists for large datasets
- Optimize images
- Use production builds for testing: `expo build`

### Database
- Create appropriate indexes
- Use projection to limit fields
- Implement pagination
- Regular backups

## Next Steps

1. **Read Documentation:**
   - [API Documentation](./docs/API.md)
   - [Deployment Guide](./docs/DEPLOYMENT.md)

2. **Explore Features:**
   - Test all API endpoints
   - Try different user roles
   - Test geofencing
   - Monitor real-time updates

3. **Customize:**
   - Update branding
   - Modify geofence rules
   - Adjust tracking intervals
   - Configure alerts

4. **Deploy:**
   - Follow deployment guide
   - Set up production MongoDB
   - Configure environment variables
   - Test production build

## Support & Resources

- **Issues:** Open GitHub issue
- **Backend Docs:** [Express.js](https://expressjs.com/)
- **Mobile Docs:** [Expo](https://docs.expo.dev/)
- **Database Docs:** [MongoDB](https://docs.mongodb.com/)
- **WebSocket Docs:** [Socket.IO](https://socket.io/docs/)

## Useful Commands Reference

```bash
# Backend
npm run dev              # Start development server
npm test                 # Run tests
npm run seed:admin       # Create admin user
npm run lint             # Check code style

# Mobile
npm start                # Start Expo
npm run ios              # Run on iOS
npm run android          # Run on Android
npx expo start -c        # Clear cache

# Database
mongosh                  # MongoDB shell
mongosh attendance_tracking  # Connect to database

# Git
git status               # Check changes
git add .                # Stage all changes
git commit -m "message"  # Commit
git push                 # Push to remote
```

Happy coding! 🚀
