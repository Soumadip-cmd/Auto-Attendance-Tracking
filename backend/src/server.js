require('dotenv').config();
console.log('NODE_ENV:', process.env. NODE_ENV);
console.log('JWT_SECRET:', process.env.JWT_SECRET ?  'LOADED ✅' : 'NOT LOADED ❌');
const { server, io } = require('./app');
const logger = require('./config/logger');
const mongoose = require('mongoose');

const PORT = process.env.PORT || 5000;

// ── One-time startup migration ────────────────────────────────────────────────
// Fix any existing College documents that have location: { type:'Point' }
// without coordinates — these break the 2dsphere index.
mongoose.connection.once('open', async () => {
  try {
    const College = require('./models/College');
    const result = await College.updateMany(
      {
        'location.type': 'Point',
        $or: [
          { 'location.coordinates': { $exists: false } },
          { 'location.coordinates': { $size: 0 } },
        ],
      },
      { $unset: { location: '' } }
    );
    if (result.modifiedCount > 0) {
      logger.info(`✅ Migration: cleared incomplete location from ${result.modifiedCount} college(s)`);
    }
  } catch (e) {
    logger.warn('College location migration skipped:', e.message);
  }
});

// Start server - Listen on all network interfaces
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📡 API available at http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
  logger.info(`📡 Network API available at http://192.168.0.108:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
  logger.info(`🔌 WebSocket server ready`);
  logger.info(`📊 Health check: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}/health`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.info(`📖 API Docs: http://localhost:${PORT}/api-docs`);
  }
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  switch (error.code) {
    case 'EACCES': 
      logger.error(`Port ${PORT} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

async function gracefulShutdown(signal) {
  logger.info(`⚠️  ${signal} signal received:  closing server gracefully... `);

  // Stop accepting new connections
  server.close(() => {
    logger.info('✅ HTTP server closed');
  });

  // Close Socket.IO connections
  io.close(() => {
    logger.info('✅ WebSocket server closed');
  });

  try {
    // Close database connection
    await mongoose.connection.close();
    logger.info('✅ Database connection closed');

    // Close cache connection if available
    try {
      const cacheService = require('./services/cacheService');
      if (cacheService) {
        await cacheService.close();
        logger.info('✅ Cache connection closed');
      }
    } catch (err) {
      // Cache service might not be initialized
      logger.debug('Cache service not available for cleanup');
    }

    logger.info('👋 Server shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ==========================================
// ERROR HANDLERS
// ==========================================

// Handle unhandled promise rejections
process. on('unhandledRejection', (err) => {
  logger.error('💥 UNHANDLED REJECTION!  Shutting down...');
  logger.error(err. name, err.message);
  logger.error(err.stack);
  
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('💥 UNCAUGHT EXCEPTION! Shutting down.. .');
  logger.error(err.name, err.message);
  logger.error(err.stack);
  process.exit(1);
});

module.exports = server;