const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const { Event } = require('../models');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    
    // Log rate limit event
    Event.log({
      eventType: 'system.rate-limit',
      severity: 'warning',
      details: {
        ip: req.ip,
        path: req.path,
        method: req.method
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later'
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    
    Event.log({
      eventType: 'system.rate-limit',
      severity: 'warning',
      details: {
        ip: req.ip,
        path: req.path,
        type: 'authentication'
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later'
    });
  }
});

/**
 * Rate limiter for location submissions
 */
const locationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 location updates per minute
  message: {
    success: false,
    message: 'Too many location updates, please slow down'
  },
  keyGenerator: (req) => {
    // Rate limit per user
    return req.user ? req.user._id.toString() : req.ip;
  }
});

/**
 * Rate limiter for file uploads
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    message: 'Upload limit exceeded, please try again later'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  locationLimiter,
  uploadLimiter
};
