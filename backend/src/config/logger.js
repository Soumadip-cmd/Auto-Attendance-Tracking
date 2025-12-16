const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory:', logsDir);
}

// Define log format
const logFormat = winston. format.combine(
  winston. format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm: ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0 && meta.service) {
      // Only show service name, not all meta
      msg += ` [${meta.service}]`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process. env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta:  { service: 'attendance-backend' },
  transports: [
    // Write all logs to console
    new winston.transports. Console({
      format: process. env.NODE_ENV === 'production' ? logFormat : consoleFormat,
      handleExceptions: true
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true
    }),
    // Write all logs to combined.log
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions. log') 
    })
  ],
  rejectionHandlers:  [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log') 
    })
  ],
  exitOnError: false
});

// Prevent crashes on logger errors
logger.on('error', (error) => {
  console.error('Logger error:', error);
});

module.exports = logger;