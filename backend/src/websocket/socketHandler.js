const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');

/**
 * Initialize WebSocket server
 */
const initializeWebSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.email} (${socket.id})`);

    // Join user-specific room
    socket.join(`user:${socket.user._id}`);

    // Join role-based rooms
    if (socket.user.role === 'admin' || socket.user.role === 'manager') {
      socket.join('admin-room');
      logger.info(`${socket.user.email} joined admin-room`);
    }

    // Send connection success message
    socket.emit('connected', {
      message: 'Successfully connected to WebSocket server',
      userId: socket.user._id,
      role: socket.user.role
    });

    // Handle subscribe to live locations (admin/manager only)
    socket.on('subscribe:live-locations', () => {
      if (socket.user.role === 'admin' || socket.user.role === 'manager') {
        socket.join('live-locations');
        logger.info(`${socket.user.email} subscribed to live locations`);
        
        socket.emit('subscribed:live-locations', {
          success: true,
          message: 'Subscribed to live location updates'
        });
      } else {
        socket.emit('error', {
          message: 'Not authorized to subscribe to live locations'
        });
      }
    });

    // Handle unsubscribe from live locations
    socket.on('unsubscribe:live-locations', () => {
      socket.leave('live-locations');
      socket.emit('unsubscribed:live-locations', {
        success: true,
        message: 'Unsubscribed from live location updates'
      });
    });

    // Handle subscribe to attendance updates
    socket.on('subscribe:attendance', () => {
      if (socket.user.role === 'admin' || socket.user.role === 'manager') {
        socket.join('attendance-updates');
        logger.info(`${socket.user.email} subscribed to attendance updates`);
        
        socket.emit('subscribed:attendance', {
          success: true,
          message: 'Subscribed to attendance updates'
        });
      } else {
        socket.emit('error', {
          message: 'Not authorized to subscribe to attendance updates'
        });
      }
    });

    // Handle user status update
    socket.on('status:update', (data) => {
      logger.info(`Status update from ${socket.user.email}:`, data);
      
      // Broadcast to admin-room
      socket.to('admin-room').emit('user:status-update', {
        userId: socket.user._id,
        userName: socket.user.fullName,
        status: data.status,
        timestamp: new Date()
      });
    });

    // Handle ping for connection keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle custom events from clients
    socket.on('location:manual-update', (data) => {
      logger.info(`Manual location update from ${socket.user.email}`);
      
      // Broadcast to admin-room
      socket.to('admin-room').emit('location:update', {
        userId: socket.user._id,
        userName: socket.user.fullName,
        location: data.location,
        timestamp: new Date()
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.user.email} (${socket.id}), reason: ${reason}`);
      
      // Notify admins of disconnection
      socket.to('admin-room').emit('user:disconnected', {
        userId: socket.user._id,
        userName: socket.user.fullName,
        timestamp: new Date()
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.user.email}:`, error);
    });
  });

  // Helper function to emit to specific user
  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  // Helper function to emit to all admins/managers
  io.emitToAdmins = (event, data) => {
    io.to('admin-room').emit(event, data);
  };

  // Helper function to broadcast alert
  io.broadcastAlert = (alert) => {
    const { type, severity, message, userId, userName } = alert;
    
    logger.warn(`Broadcasting alert: ${type} - ${message}`);
    
    io.to('admin-room').emit('alert:new', {
      type,
      severity,
      message,
      userId,
      userName,
      timestamp: new Date()
    });
  };

  // Heartbeat to check connection health
  const heartbeatInterval = setInterval(() => {
    io.emit('heartbeat', { timestamp: Date.now() });
  }, parseInt(process.env.WS_PING_INTERVAL) || 30000);

  // Cleanup on server shutdown
  io.on('close', () => {
    clearInterval(heartbeatInterval);
    logger.info('WebSocket server closed');
  });

  logger.info('WebSocket server initialized successfully');
  
  return io;
};

module.exports = { initializeWebSocket };
