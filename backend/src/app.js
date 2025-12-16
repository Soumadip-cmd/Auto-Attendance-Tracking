require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const connectDB = require('./config/database');
const logger = require('./config/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');
const { initializeWebSocket } = require('./websocket/socketHandler');

// Create Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN?. split(',') || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 5000,
  pingInterval: parseInt(process.env. WS_PING_INTERVAL) || 30000
});

// Attach io to app for use in controllers
app.io = io;

// Connect to database
connectDB();

// ==========================================
// SWAGGER API DOCUMENTATION
// ==========================================

const swaggerOptions = {
  definition: {
    openapi:  '3.0.0',
    info: {
      title:  'Attendance Tracking API',
      version: '1.0.0',
      description: 'Comprehensive API documentation for the Attendance Tracking System',
      contact: {
        name: 'API Support',
        email: 'support@attendancetracker.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api/${process.env.API_VERSION || 'v1'}`,
        description: 'Development server'
      },
      {
        url: `https://api.attendancetracker.com/api/${process.env.API_VERSION || 'v1'}`,
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:  'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type:  'string', example: 'Error message' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type:  'string' },
            firstName: { type: 'string' },
            lastName: { type:  'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'staff'] }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui . topbar { display: none }',
  customSiteTitle: 'Attendance Tracker API Docs'
}));

// Swagger JSON endpoint
app.get('/api-docs. json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express. json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// ==========================================
// LOGGING
// ==========================================

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message. trim())
    }
  }));
}

// ==========================================
// ROUTES
// ==========================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Attendance Tracking API',
    version: process.env. API_VERSION || 'v1',
    documentation: '/api-docs',
    health: `/api/${process.env.API_VERSION || 'v1'}/health`
  });
});

// Apply rate limiting to all API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use('/api', apiLimiter);

// Mount API routes
app.use(`/api/${apiVersion}`, routes);

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize WebSocket
initializeWebSocket(io);

// Export both app and server
module.exports = { app, server, io };