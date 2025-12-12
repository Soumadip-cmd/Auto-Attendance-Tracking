# API Documentation

## Base URL
```
Development: http://localhost:5000/api/v1
Production: https://your-app.vercel.app/api/v1
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Token Refresh
When the access token expires, use the refresh token to get a new access token:
```
POST /auth/refresh
Body: { "refreshToken": "<refresh_token>" }
```

---

## Authentication Endpoints

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "staff",
  "employeeId": "EMP001",
  "department": "Engineering"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "staff"
    },
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

### Logout
```http
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Update Privacy Settings
```http
PUT /auth/privacy
Authorization: Bearer <token>
Content-Type: application/json

{
  "consentGiven": true,
  "trackingEnabled": true,
  "privacySettings": {
    "shareLocationWithManagers": true,
    "allowHistoryAccess": true,
    "dataRetentionDays": 90
  }
}
```

---

## Location Endpoints

### Submit Location
```http
POST /locations
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "accuracy": 10.5,
  "altitude": 50.0,
  "heading": 90,
  "speed": 0,
  "timestamp": "2024-01-15T10:30:00Z",
  "trackingType": "foreground",
  "batteryLevel": 85,
  "networkType": "wifi",
  "activity": "still",
  "signature": "abc123...",
  "deviceId": "device-unique-id"
}
```

### Submit Batch Locations (Offline Sync)
```http
POST /locations/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "deviceId": "device-unique-id",
  "locations": [
    {
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 10.5,
      "timestamp": "2024-01-15T10:30:00Z",
      "trackingType": "background",
      "signature": "abc123..."
    }
  ]
}
```

### Get Location History
```http
GET /locations/history?userId=<id>&startDate=2024-01-01&endDate=2024-01-31&limit=100&page=1
Authorization: Bearer <token>
```

### Get Live Locations (Admin/Manager)
```http
GET /locations/live
Authorization: Bearer <token>
```

### Get Heatmap Data (Admin/Manager)
```http
GET /locations/heatmap?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

---

## Attendance Endpoints

### Check In
```http
POST /attendance/checkin
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "method": "manual",
  "deviceId": "device-unique-id"
}
```

### Check Out
```http
POST /attendance/checkout
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "method": "manual",
  "deviceId": "device-unique-id"
}
```

### Get Today's Status
```http
GET /attendance/today
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendance": {
      "checkIn": {
        "time": "2024-01-15T09:00:00Z",
        "geofence": "Main Campus"
      },
      "status": "checked-in"
    },
    "isCheckedIn": true
  }
}
```

### Get Attendance Records
```http
GET /attendance/records?startDate=2024-01-01&endDate=2024-01-31&limit=30&page=1
Authorization: Bearer <token>
```

### Get Attendance Summary
```http
GET /attendance/summary?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

### Get Attendance Overview (Admin/Manager)
```http
GET /attendance/overview
Authorization: Bearer <token>
```

---

## Geofence Endpoints

### Create Geofence (Admin)
```http
POST /geofences
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Main Campus",
  "description": "Primary office location",
  "type": "campus",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 200,
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "postalCode": "10001"
  },
  "workingHours": {
    "enabled": true,
    "schedule": [
      {
        "day": "monday",
        "startTime": "09:00",
        "endTime": "17:00"
      }
    ]
  },
  "alerts": {
    "entryAlert": true,
    "exitAlert": true,
    "violationAlert": true
  }
}
```

### Get All Geofences
```http
GET /geofences
Authorization: Bearer <token>
```

### Get Single Geofence
```http
GET /geofences/:id
Authorization: Bearer <token>
```

### Update Geofence (Admin)
```http
PUT /geofences/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Campus Name",
  "radius": 250
}
```

### Delete Geofence (Admin)
```http
DELETE /geofences/:id
Authorization: Bearer <token>
```

### Check Location Against Geofences
```http
POST /geofences/check
Authorization: Bearer <token>
Content-Type: application/json

{
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

---

## WebSocket Events

### Connection
```javascript
// Client connects with JWT token
socket = io('http://localhost:5000', {
  auth: { token: '<access_token>' }
});
```

### Server → Client Events

#### Connection Success
```javascript
socket.on('connected', (data) => {
  // { message, userId, role }
});
```

#### Location Update
```javascript
socket.on('location:update', (data) => {
  // { userId, userName, location, geofences }
});
```

#### Attendance Check-in
```javascript
socket.on('attendance:checkin', (data) => {
  // { userId, userName, time, geofence }
});
```

#### Attendance Check-out
```javascript
socket.on('attendance:checkout', (data) => {
  // { userId, userName, time, duration }
});
```

#### Alerts
```javascript
socket.on('alert:new', (data) => {
  // { type, severity, message, userId, userName }
});
```

### Client → Server Events

#### Subscribe to Live Locations (Admin/Manager)
```javascript
socket.emit('subscribe:live-locations');
```

#### Subscribe to Attendance Updates
```javascript
socket.emit('subscribe:attendance');
```

#### Send Ping
```javascript
socket.emit('ping');
```

---

## Error Responses

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Rate Limits

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 requests per 15 minutes
- **Location Submission**: 20 requests per minute
- **File Upload**: 10 requests per hour

When rate limit is exceeded, you'll receive a `429` response with a `Retry-After` header.
