const mongoose = require('mongoose');
const logger = require('./logger');

// Hardcode the MongoDB URI for now (we'll fix env loading later)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracker';

// Once mongoose has connected successfully at least once, a later drop means
// the connection is broken with no automatic recovery in this app. Running on
// in that state used to silently queue every query (check-ins, geofence
// events, everything) until it timed out ~10s later with no visible error.
// Exiting lets the process manager (PM2) restart the process and reconnect —
// that's a real recovery path, whereas "keep serving" was not.
mongoose.connection.on('disconnected', () => {
  logger.error('MongoDB disconnected — exiting so the process manager can restart and reconnect', {
    service: 'attendance-backend',
  });
  process.exit(1);
});

mongoose.connection.on('error', (error) => {
  logger.error(`MongoDB connection error: ${error.message}`, {
    service: 'attendance-backend',
    stack: error.stack,
  });
});

const connectDB = async () => {
  try {
    logger.info(`Attempting to connect to MongoDB at:  ${MONGODB_URI}`, { service: 'attendance-backend' });

    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`, { service: 'attendance-backend' });
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`, {
      service: 'attendance-backend',
      stack: error.stack,
    });
    // Fail fast instead of running with no database — let PM2 restart and retry.
    process.exit(1);
  }
};

module.exports = connectDB;