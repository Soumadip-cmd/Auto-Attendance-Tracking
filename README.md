# Auto Attendance Tracking System

A production-ready geolocation-based staff attendance and performance tracking system with real-time monitoring, geofencing, and comprehensive privacy controls.

## 🎯 Features

### Core Functionality
- ✅ **Secure Authentication**: JWT with refresh tokens, role-based access control (Admin/Manager/Staff)
- 📍 **Geolocation Tracking**: Foreground and background location tracking with battery optimization
- 🔒 **Geofencing**: Campus boundary detection with automatic check-in/check-out
- ⏱️ **Attendance Management**: Automated presence detection and manual check-in/out
- 📊 **Real-time Dashboard**: Live staff tracking with WebSocket updates
- 📈 **Analytics**: Location history, heatmaps, and performance metrics
- 🔐 **Privacy & Consent**: Explicit user consent, privacy controls, GDPR/PDPA compliance
- 🛡️ **Security**: Tamper detection, rate limiting, audit logging
- 📴 **Offline Support**: Caching and synchronization when connection restored

### Technical Highlights
- **Mobile**: React Native (Expo) with background location tracking
- **Backend**: Express.js with Socket.IO for real-time features
- **Database**: MongoDB with optimized schemas and indexes
- **Security**: Signed location data, rate limiting, audit trails
- **Testing**: Unit and integration tests with Jest
- **CI/CD**: GitHub Actions workflow
- **Deployment**: Vercel (backend) + MongoDB Atlas

## 📁 Project Structure

```
auto-attendance-tracking/
├── backend/              # Express.js server
│   ├── src/
│   │   ├── config/       # Configuration files
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Auth, RBAC, rate limiting
│   │   ├── models/       # MongoDB schemas
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── utils/        # Helper functions
│   │   ├── websocket/    # Socket.IO handlers
│   │   └── app.js        # Express app setup
│   ├── tests/            # Test files
│   └── package.json
├── mobile/               # React Native (Expo) app
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── screens/      # App screens
│   │   ├── navigation/   # Navigation setup
│   │   ├── services/     # API and location services
│   │   ├── store/        # State management
│   │   └── utils/        # Helpers
│   ├── app.json
│   └── package.json
├── docs/                 # Documentation
│   ├── API.md            # API documentation
│   ├── DEPLOYMENT.md     # Deployment guide
│   ├── wireframes/       # UI wireframes
│   └── postman/          # Postman collection
└── package.json          # Root package.json
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- Expo CLI for mobile development
- iOS Simulator or Android Emulator (for testing)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd AutoAttendanceTracking
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Setup environment variables**

Create `.env` file in `backend/`:
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your configuration (see Backend Setup below).

Create `.env` file in `mobile/`:
```bash
cp mobile/.env.example mobile/.env
```

4. **Start MongoDB** (if running locally)
```bash
mongod --dbpath ./data
```

5. **Run the backend server**
```bash
npm run dev:backend
```

6. **Run the mobile app**
```bash
npm run dev:mobile
```

## 🔧 Backend Setup

### Environment Variables (backend/.env)

```env
# Server
NODE_ENV=development
PORT=5000
API_VERSION=v1

# MongoDB
MONGODB_URI=mongodb://localhost:27017/attendance_tracking
# Or use MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance_tracking

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-change-in-production
REFRESH_TOKEN_EXPIRES_IN=7d

# Location Security
LOCATION_SIGNATURE_SECRET=your-location-signature-secret-key

# CORS
CORS_ORIGIN=http://localhost:19006,exp://localhost:19000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# WebSocket
WS_PING_INTERVAL=30000
WS_PING_TIMEOUT=5000

# Data Retention (days)
LOCATION_HISTORY_RETENTION_DAYS=90
AUDIT_LOG_RETENTION_DAYS=365

# Admin Setup
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme123
```

### Database Setup

The backend will automatically create indexes and setup the database on first run. To manually seed an admin user:

```bash
cd backend
npm run seed:admin
```

## 📱 Mobile Setup

### Environment Variables (mobile/.env)

```env
API_URL=http://localhost:5000/api/v1
WS_URL=http://localhost:5000
```

For physical device testing, replace `localhost` with your machine's IP address:
```env
API_URL=http://192.168.1.100:5000/api/v1
WS_URL=http://192.168.1.100:5000
```

### Running on Device

**iOS:**
```bash
cd mobile
npx expo start --ios
```

**Android:**
```bash
cd mobile
npx expo start --android
```

**Web (for development only):**
```bash
cd mobile
npx expo start --web
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

### Integration Tests
```bash
cd backend
npm run test:integration
```

## 📚 API Documentation

### Authentication Endpoints

**POST /api/v1/auth/register**
- Register new user (requires admin role for bulk imports)

**POST /api/v1/auth/login**
- Login and receive JWT tokens

**POST /api/v1/auth/refresh**
- Refresh access token using refresh token

**POST /api/v1/auth/logout**
- Logout and invalidate tokens

### Location Endpoints

**POST /api/v1/locations**
- Submit location data (with signature for tamper detection)

**GET /api/v1/locations/history**
- Get user's location history (staff: own, admin/manager: all)

**GET /api/v1/locations/live**
- Get live locations of active users (admin/manager only)

### Attendance Endpoints

**POST /api/v1/attendance/checkin**
- Manual check-in

**POST /api/v1/attendance/checkout**
- Manual check-out

**GET /api/v1/attendance/records**
- Get attendance records with filters

**GET /api/v1/attendance/summary**
- Get attendance summary and statistics

### Geofence Endpoints

**POST /api/v1/geofences**
- Create geofence (admin only)

**GET /api/v1/geofences**
- List all geofences

**PUT /api/v1/geofences/:id**
- Update geofence (admin only)

**DELETE /api/v1/geofences/:id**
- Delete geofence (admin only)

### User Management

**GET /api/v1/users**
- List users (admin/manager)

**GET /api/v1/users/:id**
- Get user details

**PUT /api/v1/users/:id**
- Update user

**DELETE /api/v1/users/:id**
- Delete user (admin only)

### WebSocket Events

**Client → Server:**
- `authenticate`: Authenticate WebSocket connection
- `subscribe:live-locations`: Subscribe to live location updates

**Server → Client:**
- `location:update`: New location data for tracked user
- `attendance:checkin`: User checked in
- `attendance:checkout`: User checked out
- `alert:geofence-violation`: User left designated area

See [docs/API.md](docs/API.md) for detailed API documentation.

## 🔐 Security Features

1. **Authentication**: JWT with access and refresh tokens
2. **Authorization**: Role-based access control (RBAC)
3. **Location Integrity**: HMAC-signed location data to prevent tampering
4. **Rate Limiting**: Protect against abuse and DDoS
5. **Audit Logging**: Comprehensive event logging for compliance
6. **Data Encryption**: Sensitive data encrypted at rest and in transit
7. **Privacy Controls**: User consent management and data access controls

## 🌍 Privacy & Compliance

### GDPR/PDPA Features
- ✅ Explicit user consent before tracking
- ✅ Right to access data (export functionality)
- ✅ Right to deletion (data purge)
- ✅ Data minimization (only necessary data collected)
- ✅ Configurable data retention periods
- ✅ Audit trail for data access
- ✅ Privacy-by-design architecture

### User Controls
- Enable/disable location tracking
- View all collected data
- Export personal data
- Request data deletion
- Manage tracking preferences

## 📊 Monitoring & Analytics

### Admin Dashboard Features
- Real-time staff location map
- Attendance overview and statistics
- Geofence status and violations
- Performance metrics
- Alert management
- User activity logs

### Reports
- Daily/Weekly/Monthly attendance reports
- Location heatmaps
- Time spent in geofenced areas
- Late arrivals and early departures
- Export to CSV/PDF

## 🚀 Deployment

### Backend Deployment (Vercel)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
cd backend
vercel --prod
```

3. Set environment variables in Vercel dashboard

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

### MongoDB Atlas Setup

1. Create cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create database user
3. Whitelist IP addresses (or allow all for development)
4. Copy connection string to `MONGODB_URI`

### Mobile App Deployment

**iOS:**
```bash
cd mobile
eas build --platform ios
eas submit --platform ios
```

**Android:**
```bash
cd mobile
eas build --platform android
eas submit --platform android
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues, questions, or contributions, please open an issue on GitHub.

## 🔮 Roadmap

- [ ] Face recognition for check-in/out
- [ ] Integration with HR systems
- [ ] Advanced analytics with ML predictions
- [ ] Multi-tenant support
- [ ] WhatsApp/SMS notifications
- [ ] Shift management
- [ ] Leave management integration
