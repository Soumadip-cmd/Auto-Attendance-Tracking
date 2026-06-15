const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../config/logger');
const liveTrackingService = require('../services/liveTrackingService');
const {
  canViewLiveTracking,
  getUserCollegeId,
  getUserDepartmentId,
  isAdminLike,
  isTeacherLike
} = require('../utils/roleUtils');

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

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .populate('college', 'name code')
        .populate('departmentRef', 'name code');

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

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.email} (${socket.id})`);

    const collegeId = getUserCollegeId(socket.user);
    const departmentId = getUserDepartmentId(socket.user);

    socket.join(`user:${socket.user._id}`);
    socket.join(`role:${socket.user.role}`);

    if (collegeId) socket.join(`college:${collegeId}`);
    if (departmentId) socket.join(`department:${departmentId}`);

    if (canViewLiveTracking(socket.user)) {
      socket.join('admin-room');
      logger.info(`${socket.user.email} joined admin-room`);
    }

    if (isTeacherLike(socket.user)) {
      socket.join(`teacher:${socket.user._id}`);
    }

    socket.emit('connected', {
      message: 'Successfully connected to WebSocket server',
      userId: socket.user._id,
      role: socket.user.role,
      collegeId,
      departmentId
    });

    socket.on('subscribe:live-locations', (data = {}) => {
      if (!canViewLiveTracking(socket.user)) {
        return socket.emit('error', {
          message: 'Not authorized to subscribe to live locations'
        });
      }

      socket.join('live-locations');
      if (data.collegeId) socket.join(`college:${data.collegeId}`);
      if (data.departmentId) socket.join(`department:${data.departmentId}`);

      logger.info(`${socket.user.email} subscribed to live locations`);
      socket.emit('subscribed:live-locations', {
        success: true,
        message: 'Subscribed to live location updates'
      });
    });

    socket.on('subscribe:live-teachers', (data = {}) => {
      if (!canViewLiveTracking(socket.user)) {
        return socket.emit('error', {
          message: 'Not authorized to subscribe to teacher live tracking'
        });
      }

      socket.join('live-locations');
      if (data.collegeId) socket.join(`college:${data.collegeId}`);
      if (data.departmentId) socket.join(`department:${data.departmentId}`);

      socket.emit('subscribed:live-teachers', {
        success: true,
        message: 'Subscribed to teacher live tracking'
      });
    });

    socket.on('unsubscribe:live-locations', () => {
      socket.leave('live-locations');
      socket.emit('unsubscribed:live-locations', {
        success: true,
        message: 'Unsubscribed from live location updates'
      });
    });

    socket.on('subscribe:attendance', () => {
      if (isAdminLike(socket.user) || socket.user.role === 'hod') {
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

    socket.on('status:update', (data) => {
      logger.info(`Status update from ${socket.user.email}:`, data);

      socket.to('admin-room').emit('user:status-update', {
        userId: socket.user._id,
        userName: socket.user.fullName,
        status: data.status,
        timestamp: new Date()
      });
    });

    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('location:manual-update', (data) => {
      logger.info(`Manual location update from ${socket.user.email}`);

      socket.to('admin-room').emit('location:update', {
        userId: socket.user._id,
        userName: socket.user.fullName,
        location: data.location,
        timestamp: new Date()
      });
    });

    socket.on('teacher:location:update', async (data, ack) => {
      try {
        if (!isTeacherLike(socket.user) && !isAdminLike(socket.user) && socket.user.role !== 'hod') {
          const error = { success: false, message: 'Not authorized to stream teacher location' };
          if (ack) ack(error);
          return socket.emit('error', error);
        }

        const result = await liveTrackingService.processTeacherLocation({
          user: socket.user,
          location: data,
          io,
          source: data?.source || 'socket',
          requestContext: {
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          }
        });

        const response = {
          success: true,
          data: result.payload,
          validation: result.validation
        };

        socket.emit('teacher:location:ack', response);
        if (ack) ack(response);
      } catch (error) {
        logger.error(`Live location update failed for ${socket.user.email}:`, error);
        const response = {
          success: false,
          message: error.message || 'Failed to process live location'
        };
        socket.emit('teacher:location:error', response);
        if (ack) ack(response);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`User disconnected: ${socket.user.email} (${socket.id}), reason: ${reason}`);

      if (isTeacherLike(socket.user)) {
        liveTrackingService.stopTeacherTracking(socket.user._id).catch((error) => {
          logger.error(`Failed to mark ${socket.user.email} offline:`, error);
        });
      }

      socket.to('admin-room').emit('user:disconnected', {
        userId: socket.user._id,
        userName: socket.user.fullName,
        timestamp: new Date()
      });
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for user ${socket.user.email}:`, error);
    });
  });

  io.emitToUser = (userId, event, data) => {
    io.to(`user:${userId}`).emit(event, data);
  };

  io.emitToAdmins = (event, data) => {
    io.to('admin-room').emit(event, data);
  };

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

  const heartbeatInterval = setInterval(() => {
    io.emit('heartbeat', { timestamp: Date.now() });
  }, parseInt(process.env.WS_PING_INTERVAL) || 30000);

  io.on('close', () => {
    clearInterval(heartbeatInterval);
    logger.info('WebSocket server closed');
  });

  logger.info('WebSocket server initialized successfully');

  return io;
};

module.exports = { initializeWebSocket };
