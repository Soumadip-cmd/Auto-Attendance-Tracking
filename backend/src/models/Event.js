const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // Event type
  eventType: {
    type: String,
    required: true,
    enum: [
      // Authentication events
      'user.login',
      'user.logout',
      'user.register',
      'user.password-change',
      'user.password-reset',
      // User management events
      'user.create',
      'user.update',
      'user.delete',
      'user.role-change',
      // Attendance events
      'attendance.checkin',
      'attendance.checkout',
      'attendance.manual-override',
      // Location events
      'location.update',
      'location.tamper-detected',
      // Privacy events
      'privacy.consent-given',
      'privacy.consent-revoked',
      'privacy.tracking-enabled',
      'privacy.tracking-disabled',
      'privacy.data-export',
      'privacy.data-deletion',
      // System events
      'system.error',
      'system.warning',
      'system.rate-limit',
      // Device events
      'device.register',
      'device.update',
      'device.deactivate'
    ],
    index: true
  },
  // User who performed the action
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  // User affected by the action (if different from actor)
  target: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Resource type and ID
  resource: {
    type: {
      type: String,
      enum: ['user', 'device', 'location', 'attendance', 'system']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  // Event details
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  // IP address and user agent
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  // Device information
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  },
  // Status and severity
  status: {
    type: String,
    enum: ['success', 'failure', 'warning'],
    default: 'success'
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  },
  // Error information (if applicable)
  error: {
    message: String,
    stack: String,
    code: String
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
eventSchema.index({ createdAt: -1 });
eventSchema.index({ eventType: 1, createdAt: -1 });
eventSchema.index({ actor: 1, createdAt: -1 });
eventSchema.index({ target: 1, createdAt: -1 });
eventSchema.index({ 'resource.type': 1, 'resource.id': 1 });
eventSchema.index({ severity: 1, createdAt: -1 });

// TTL index for automatic deletion after retention period
// This will be set based on AUDIT_LOG_RETENTION_DAYS from environment
eventSchema.index(
  { createdAt: 1 }, 
  { 
    expireAfterSeconds: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || 365) * 24 * 60 * 60 
  }
);

// Static method to log an event
eventSchema.statics.log = async function(eventData) {
  try {
    const event = new this(eventData);
    await event.save();
    return event;
  } catch (error) {
    console.error('Failed to log event:', error);
    // Don't throw error - logging failure shouldn't break the application
  }
};

// Static method to get events with filters
eventSchema.statics.getEvents = async function(filters = {}, options = {}) {
  const {
    eventType,
    actor,
    target,
    resourceType,
    severity,
    startDate,
    endDate,
    limit = 100,
    skip = 0
  } = options;
  
  const query = { ...filters };
  
  if (eventType) query.eventType = eventType;
  if (actor) query.actor = actor;
  if (target) query.target = target;
  if (resourceType) query['resource.type'] = resourceType;
  if (severity) query.severity = severity;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('actor', 'firstName lastName email')
    .populate('target', 'firstName lastName email')
    .populate('device', 'deviceName deviceType');
};

// Static method to get event statistics
eventSchema.statics.getStatistics = async function(startDate, endDate) {
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$eventType',
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
  
  return stats;
};

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
