const mongoose = require('mongoose');
const logger = require('./logger');

// Hardcode the MongoDB URI for now (we'll fix env loading later)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-tracker';

const connectDB = async () => {
  try {
    logger.info(`Attempting to connect to MongoDB at:  ${MONGODB_URI}`, { service: 'attendance-backend' });
    
    const conn = await mongoose.connect(MONGODB_URI, {
      // Mongoose 6+ doesn't need these options
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`, { service: 'attendance-backend' });
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`, {
      service: 'attendance-backend',
      stack: error.stack,
    });
    // Don't exit - let the server run without database for now
    logger.warn('Server running without database connection', { service: 'attendance-backend' });
  }
};

module.exports = connectDB;