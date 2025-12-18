const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const http = require('http');
const socketIO = require('socket.io');
const morgan = require('morgan');
const path = require('path');

const logger = require('./config/logger');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const rateLimiter = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes'); // ✅ ADD THIS
const geofenceRoutes = require('./routes/geofenceRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const healthRoutes = require('./routes/healthRoutes');

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = socketIO(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// ==========================================
// CORS CONFIGURATION - CRITICAL FIX
// ==========================================

const corsOptions = {
  origin:  function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:5000',
        ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Compression middleware
app.use(compression());

// ==========================================
// LOGGING MIDDLEWARE
// ==========================================

// Development logging
if (process. env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Production logging
if (process.env. NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// ==========================================
// BODY PARSER MIDDLEWARE
// ==========================================

app.use(express. json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// STATIC FILES
// ==========================================

app.use(express.static(path.join(__dirname, '../public')));

// ==========================================
// DATABASE CONNECTION
// ==========================================

connectDB();

// ==========================================
// API ROUTES
// ==========================================

const API_VERSION = process.env.API_VERSION || 'v1';

// Health check route (no rate limiting)
app.use(`/api/${API_VERSION}/health`, healthRoutes);

// Apply rate limiting to API routes
app.use(`/api/${API_VERSION}`, rateLimiter);

// API routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/attendance`, attendanceRoutes);
app.use(`/api/${API_VERSION}/reports`, reportRoutes);
app.use(`/api/${API_VERSION}/dashboard`, dashboardRoutes); // ✅ ADD THIS
app.use(`/api/${API_VERSION}/geofences`, geofenceRoutes);
app.use(`/api/${API_VERSION}/settings`, settingsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Attendance Tracking System API',
    version: API_VERSION,
    documentation: `/api-docs`,
    health: `/api/${API_VERSION}/health`,
  });
});

// ==========================================
// API DOCUMENTATION (Swagger)
// ==========================================

if (process.env.NODE_ENV === 'development') {
  const swaggerUi = require('swagger-ui-express');
  const swaggerDocument = require('./config/swagger');
  
  app.use('/api-docs', swaggerUi. serve, swaggerUi.setup(swaggerDocument));
}

// ==========================================
// WEBSOCKET SETUP
// ==========================================

io.on('connection', (socket) => {
  logger.info(`New WebSocket connection: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`WebSocket disconnected: ${socket.id}`);
  });

  // Handle attendance events
  socket.on('attendance:update', (data) => {
    io.emit('attendance:updated', data);
  });
});

// Make io accessible to routes
app.set('io', io);

logger.info('WebSocket server initialized successfully');

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 Not Found handler
app. use(notFound);

// Global error handler
app.use(errorHandler);

// ==========================================
// EXPORTS
// ==========================================

module. exports = { app, server, io };