const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');
const { Event } = require('../models');

/**
 * Middleware to protect routes - requires valid JWT token
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      logger.warn('No token provided in request', {
        path: req.path,
        method: req.method,
        headers: req.headers.authorization
      });
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route - No token provided'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is active
      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'User account is deactivated'
        });
      }

      // Check if user changed password after token was issued
      if (req.user.changedPasswordAfter(decoded.iat)) {
        return res.status(401).json({
          success: false,
          message: 'Password recently changed. Please log in again'
        });
      }

      next();
    } catch (err) {
      logger.error('JWT verification failed:', err);
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Middleware to restrict access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.id} with role ${req.user.role}`);
      
      // Log security event
      Event.log({
        eventType: 'system.warning',
        actor: req.user._id,
        severity: 'warning',
        details: {
          message: 'Unauthorized access attempt',
          requiredRoles: roles,
          userRole: req.user.role,
          path: req.path
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

/**
 * Middleware to allow users to access their own resources or admins/managers to access all
 */
const authorizeOwnerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized'
    });
  }

  const resourceUserId = req.params.userId || req.params.id || req.body.userId;
  
  // Allow if user is admin or manager, or if accessing own resource
  if (
    req.user.role === 'admin' || 
    req.user.role === 'manager' || 
    req.user._id.toString() === resourceUserId
  ) {
    return next();
  }

  logger.warn(`Unauthorized resource access by user ${req.user.id}`);
  
  return res.status(403).json({
    success: false,
    message: 'Not authorized to access this resource'
  });
};

module.exports = {
  protect,
  authorize,
  authorizeOwnerOrAdmin
};
