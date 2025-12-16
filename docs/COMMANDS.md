# Quick Command Reference

## Project Setup

### Initial Setup
```bash
# Clone repository
git clone <repository-url>
cd AutoAttendanceTracking

# Install all dependencies
npm run install:all
```

### Environment Setup
```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your settings

# Mobile
cd ../mobile
cp .env.example .env
# Edit .env with your API URL
```

## Running the System

### Start Backend
```bash
# From backend directory
npm run dev           # Development mode with nodemon
npm start             # Production mode

# Alternative: from root
npm run dev:backend
```

### Start Mobile App
```bash
# From mobile directory
npm start             # Start Expo dev server
npm run ios           # Run on iOS simulator
npm run android       # Run on Android emulator

# Alternative: from root
npm run dev:mobile
```

### Start Both (Parallel)
```bash
# Windows PowerShell
Start-Process -FilePath "npm" -ArgumentList "run", "dev:backend" -NoNewWindow
Start-Process -FilePath "npm" -ArgumentList "run", "dev:mobile" -NoNewWindow

# Or open two terminals and run separately
```

## Database Management

### MongoDB Commands
```bash
# Start MongoDB locally
mongod --dbpath ./data

# Connect to MongoDB shell
mongosh
mongosh attendance_tracking

# Create admin user
cd backend
npm run seed:admin
```

### MongoDB Shell Commands
```javascript
// Show databases
show dbs

// Use database
use attendance_tracking

// Show collections
show collections

// Query users
db.users.find().pretty()

// Count documents
db.users.countDocuments()

// Find specific user
db.users.findOne({ email: "admin@example.com" })

// Update user
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { isActive: true } }
)

// Delete user
db.users.deleteOne({ email: "test@example.com" })

// Drop collection
db.users.drop()

// Drop database
db.dropDatabase()

// Create index
db.locations.createIndex({ "location": "2dsphere" })

// View indexes
db.locations.getIndexes()
```

## Testing

### Backend Tests
```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js

# Run in watch mode
npm run test:watch

# Run integration tests
npm run test:integration
```

### Linting
```bash
# Backend
cd backend
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues

# Mobile
cd mobile
npm run lint
```

## API Testing

### Using curl

#### Authentication
```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@12345"
  }'

# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "firstName": "New",
    "lastName": "User"
  }'

# Get current user
curl -X GET http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Geofences
```bash
# Create geofence (Admin only)
curl -X POST http://localhost:5000/api/v1/geofences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Main Campus",
    "type": "campus",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius": 200
  }'

# Get all geofences
curl -X GET http://localhost:5000/api/v1/geofences \
  -H "Authorization: Bearer YOUR_TOKEN"

# Check location
curl -X POST http://localhost:5000/api/v1/geofences/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060
  }'
```

#### Attendance
```bash
# Check in
curl -X POST http://localhost:5000/api/v1/attendance/checkin \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "method": "manual",
    "deviceId": "test-device-id"
  }'

# Check out
curl -X POST http://localhost:5000/api/v1/attendance/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "method": "manual",
    "deviceId": "test-device-id"
  }'

# Get today's status
curl -X GET http://localhost:5000/api/v1/attendance/today \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Using Postman
```bash
# Import collection
File → Import → Select docs/postman/AttendanceTracking.postman_collection.json

# Set environment variables
- baseUrl: http://localhost:5000/api/v1
- accessToken: (will be set automatically after login)
```

## Git Commands

### Basic Workflow
```bash
# Check status
git status

# Create and switch to new branch
git checkout -b feature/new-feature

# Stage changes
git add .
git add specific-file.js

# Commit changes
git commit -m "Add: New feature description"

# Push to remote
git push origin feature/new-feature

# Pull latest changes
git pull origin main

# Merge branch
git checkout main
git merge feature/new-feature
```

### Useful Git Commands
```bash
# View commit history
git log --oneline

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# View differences
git diff

# Stash changes
git stash
git stash pop

# View branches
git branch -a

# Delete branch
git branch -d feature/old-feature
```

## Deployment

### Backend (Vercel)
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy to production
cd backend
vercel --prod

# View logs
vercel logs
```

### Mobile (Expo)
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
cd mobile
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

## Troubleshooting

### Kill Port Processes
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5000
kill -9 <PID>

# Alternative: Change port in .env
PORT=5001
```

### Clear Caches
```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Mobile
cd mobile
rm -rf node_modules package-lock.json
npm install
npx expo start -c

# Clear Expo cache
npx expo start --clear
```

### Reset Database
```bash
# Connect to MongoDB
mongosh attendance_tracking

# Drop database
db.dropDatabase()

# Recreate admin user
cd backend
npm run seed:admin
```

## Monitoring & Logs

### View Logs
```bash
# Backend logs (development)
# Logs appear in terminal where backend is running

# Backend log files
tail -f backend/logs/combined.log
tail -f backend/logs/error.log

# Mobile logs
# Logs appear in Expo Dev Tools console
```

### MongoDB Monitoring
```bash
# Connection stats
mongosh --eval "db.serverStatus().connections"

# Database stats
mongosh attendance_tracking --eval "db.stats()"

# Collection stats
mongosh attendance_tracking --eval "db.locations.stats()"
```

## Useful Development Scripts

### Generate Secure Keys
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Using OpenSSL (Mac/Linux)
openssl rand -base64 32

# Using PowerShell (Windows)
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### Find Your IP Address
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig

# All platforms (Node.js)
node -e "require('dns').lookup(require('os').hostname(), (err, addr) => console.log(addr))"
```

### Check Node/npm Versions
```bash
node -v
npm -v
mongod --version
expo --version
```

## Performance & Optimization

### Database Indexes
```javascript
// In MongoDB shell
use attendance_tracking

// Check existing indexes
db.locations.getIndexes()

// Create missing indexes
db.locations.createIndex({ user: 1, timestamp: -1 })
db.locations.createIndex({ location: "2dsphere" })
db.attendances.createIndex({ user: 1, date: -1 })
```

### Analyze Query Performance
```javascript
// In MongoDB shell
db.locations.find({ user: ObjectId("...") }).explain("executionStats")
```

## Backup & Restore

### MongoDB Backup
```bash
# Backup entire database
mongodump --db attendance_tracking --out ./backup

# Backup specific collection
mongodump --db attendance_tracking --collection users --out ./backup

# Restore database
mongorestore --db attendance_tracking ./backup/attendance_tracking
```

### Export/Import Data
```bash
# Export collection to JSON
mongoexport --db attendance_tracking --collection users --out users.json

# Import collection from JSON
mongoimport --db attendance_tracking --collection users --file users.json
```

## Environment Variables Quick Reference

### Backend (.env)
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance_tracking
JWT_SECRET=<32-char-random-string>
REFRESH_TOKEN_SECRET=<32-char-random-string>
LOCATION_SIGNATURE_SECRET=<32-char-random-string>
CORS_ORIGIN=http://localhost:19006,exp://localhost:19000
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@12345
```

### Mobile (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api/v1
EXPO_PUBLIC_WS_URL=http://localhost:5000

# For physical device (replace with your IP)
# EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
# EXPO_PUBLIC_WS_URL=http://192.168.1.100:5000
```

## Common Issues & Solutions

### "Port already in use"
```bash
# Find and kill process
lsof -i :5000 && kill -9 $(lsof -t -i:5000)

# Or change port
PORT=5001 npm run dev
```

### "MongoDB connection failed"
```bash
# Check if MongoDB is running
pgrep mongod

# Start MongoDB
mongod --dbpath ./data
```

### "Cannot connect to API from mobile"
```bash
# Use your computer's IP address in mobile/.env
# Find IP: ipconfig (Windows) or ifconfig (Mac/Linux)
EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api/v1
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

For more detailed information, see:
- [Local Setup Guide](./LOCAL_SETUP.md)
- [API Documentation](./API.md)
- [Deployment Guide](./DEPLOYMENT.md)
