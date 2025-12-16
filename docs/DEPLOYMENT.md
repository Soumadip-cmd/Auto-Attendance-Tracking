# Deployment Guide

This guide covers deploying the Auto Attendance Tracking System to production.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Setup](#mongodb-atlas-setup)
3. [Backend Deployment (Vercel)](#backend-deployment-vercel)
4. [Mobile App Deployment](#mobile-app-deployment)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment](#post-deployment)

---

## Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account
- Vercel account
- Expo account (for mobile deployment)
- Git repository

---

## MongoDB Atlas Setup

### 1. Create MongoDB Atlas Cluster

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Sign up or log in
3. Click "Build a Database"
4. Choose "M0 Free" tier or your preferred tier
5. Select your cloud provider and region
6. Name your cluster (e.g., "attendance-cluster")
7. Click "Create"

### 2. Configure Database Access

1. Go to "Database Access" in left sidebar
2. Click "Add New Database User"
3. Create username and password
4. Set privileges to "Read and write to any database"
5. Click "Add User"

### 3. Configure Network Access

For development:
1. Go to "Network Access"
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (0.0.0.0/0)
4. Or add your specific IP addresses

For production, add Vercel's IP ranges or use specific IPs.

### 4. Get Connection String

1. Go to "Database" → "Connect"
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with your database name (e.g., `attendance_production`)

Example:
```
mongodb+srv://username:password@attendance-cluster.xxxxx.mongodb.net/attendance_production?retryWrites=true&w=majority
```

---

## Backend Deployment (Vercel)

### 1. Prepare Backend for Deployment

Create `vercel.json` in backend folder:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Install Vercel CLI

```bash
npm install -g vercel
```

### 3. Login to Vercel

```bash
vercel login
```

### 4. Deploy

```bash
cd backend
vercel --prod
```

Follow the prompts:
- Set up and deploy? Yes
- Which scope? Select your account
- Link to existing project? No
- Project name: auto-attendance-backend
- Directory: ./
- Override settings? No

### 5. Configure Environment Variables

After deployment, add environment variables in Vercel dashboard:

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable from `.env.example`:

```
NODE_ENV=production
PORT=5000
API_VERSION=v1
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<generate-strong-random-string-min-32-chars>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=<generate-different-strong-random-string>
REFRESH_TOKEN_EXPIRES_IN=7d
LOCATION_SIGNATURE_SECRET=<generate-another-strong-random-string>
CORS_ORIGIN=<your-mobile-app-url-or-*-for-development>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Generate secure random strings:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 6. Redeploy with Environment Variables

```bash
vercel --prod
```

Your backend should now be live at `https://your-project.vercel.app`

---

## Mobile App Deployment

### 1. Update API URLs

Update `mobile/.env`:
```env
API_URL=https://your-backend.vercel.app/api/v1
WS_URL=https://your-backend.vercel.app
```

### 2. Install EAS CLI

```bash
npm install -g eas-cli
```

### 3. Login to Expo

```bash
eas login
```

### 4. Configure EAS

```bash
cd mobile
eas build:configure
```

This creates `eas.json`:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

### 5. Build for iOS

```bash
eas build --platform ios --profile production
```

Requirements:
- Apple Developer account ($99/year)
- App Store Connect access
- Push notification certificate

### 6. Build for Android

```bash
eas build --platform android --profile production
```

This will generate an APK or AAB file.

### 7. Submit to App Stores

**iOS:**
```bash
eas submit --platform ios
```

**Android:**
```bash
eas submit --platform android
```

Or manually upload:
- iOS: Upload to App Store Connect
- Android: Upload to Google Play Console

---

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| NODE_ENV | Environment | production |
| PORT | Server port | 5000 |
| API_VERSION | API version | v1 |
| MONGODB_URI | MongoDB connection string | mongodb+srv://... |
| JWT_SECRET | JWT secret key | random-32-char-string |
| JWT_EXPIRES_IN | Access token expiry | 15m |
| REFRESH_TOKEN_SECRET | Refresh token secret | random-32-char-string |
| REFRESH_TOKEN_EXPIRES_IN | Refresh token expiry | 7d |
| LOCATION_SIGNATURE_SECRET | Location signing key | random-32-char-string |
| CORS_ORIGIN | Allowed origins | https://app.com,* |
| RATE_LIMIT_WINDOW_MS | Rate limit window | 900000 |
| RATE_LIMIT_MAX_REQUESTS | Max requests per window | 100 |
| LOCATION_HISTORY_RETENTION_DAYS | Location data retention | 90 |
| AUDIT_LOG_RETENTION_DAYS | Audit log retention | 365 |
| ADMIN_EMAIL | Default admin email | admin@example.com |
| ADMIN_PASSWORD | Default admin password | SecurePass123! |

### Mobile (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| API_URL | Backend API URL | https://api.example.com/api/v1 |
| WS_URL | WebSocket URL | https://api.example.com |
| LOCATION_UPDATE_INTERVAL | Location update interval (ms) | 300000 |
| LOCATION_DISTANCE_FILTER | Distance filter (meters) | 50 |

---

## Post-Deployment

### 1. Create Admin User

SSH into your server or use the Vercel CLI:
```bash
vercel env pull
cd backend
npm run seed:admin
```

Or manually create via API:
```bash
curl -X POST https://your-api.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePass123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

### 2. Test Endpoints

```bash
# Health check
curl https://your-api.vercel.app/api/v1/health

# Login
curl -X POST https://your-api.vercel.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"SecurePass123!"}'
```

### 3. Monitor Logs

**Vercel:**
- Go to your project dashboard
- Click "Logs" tab
- Monitor real-time logs

**MongoDB Atlas:**
- Go to "Metrics" tab
- Monitor database performance
- Set up alerts

### 4. Setup Monitoring

Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **DataDog** for APM
- **UptimeRobot** for uptime monitoring

### 5. Backup Strategy

**MongoDB Atlas:**
1. Go to "Backup" tab
2. Enable "Continuous Backup"
3. Configure retention policy

**Code:**
- Ensure Git repository is backed up
- Tag releases: `git tag v1.0.0`

---

## Troubleshooting

### Backend not starting
- Check Vercel logs
- Verify environment variables are set
- Check MongoDB connection string

### Mobile app can't connect
- Verify API_URL is correct
- Check CORS settings in backend
- Ensure backend is accessible from mobile network

### Location tracking not working
- Check app permissions
- Verify location service is running
- Check battery optimization settings

### WebSocket connection fails
- Ensure WS_URL is correct
- Check firewall settings
- Verify JWT token is valid

---

## Scaling Considerations

### Backend
- **Horizontal Scaling**: Vercel handles this automatically
- **Database**: Upgrade MongoDB Atlas tier as needed
- **Caching**: Add Redis for session management
- **CDN**: Use Vercel's CDN for static assets

### Mobile
- **Push Notifications**: Implement Firebase Cloud Messaging
- **Image Optimization**: Use Cloudinary or similar
- **Analytics**: Add Google Analytics or Mixpanel

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong, unique secrets for JWT
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable MongoDB authentication
- [ ] Restrict MongoDB network access
- [ ] Enable audit logging
- [ ] Set up security headers (Helmet.js)
- [ ] Regular security updates
- [ ] GDPR/PDPA compliance review

---

## Cost Estimation

**Free Tier:**
- MongoDB Atlas: M0 Free (512MB storage)
- Vercel: Hobby (100GB bandwidth)
- Expo: Free (development)

**Production Estimate (small team, 50 users):**
- MongoDB Atlas M10: ~$57/month
- Vercel Pro: $20/month
- Apple Developer: $99/year
- Google Play: $25 one-time
- **Total**: ~$77-100/month

---

## Support

For deployment issues:
- Vercel: [vercel.com/support](https://vercel.com/support)
- MongoDB Atlas: [mongodb.com/support](https://www.mongodb.com/support)
- Expo: [docs.expo.dev](https://docs.expo.dev)
