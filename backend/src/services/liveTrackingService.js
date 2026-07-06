const {
  Event,
  Geofence,
  LiveLocation,
  LiveLocationHistory,
  MovementPermission,
  User
} = require('../models');
const geoUtils = require('../utils/geoUtils');
const {
  canViewLiveTracking,
  getUserCollegeId,
  getUserDepartmentId,
  isSuperAdmin
} = require('../utils/roleUtils');
const { buildApplicableGeofenceFilter: buildScopedApplicableGeofenceFilter } = require('../utils/geofenceScope');
const DEFAULT_MAX_ACCURACY_METERS = Number(process.env.LIVE_TRACKING_MAX_ACCURACY_METERS || 150);
const VIOLATION_LOG_WINDOW_MS = Number(process.env.LIVE_TRACKING_VIOLATION_LOG_WINDOW_MS || 10 * 60 * 1000);
const AUDIT_EVERY_LIVE_UPDATE = process.env.AUDIT_EVERY_LIVE_LOCATION_UPDATE === 'true';

const toObjectIdString = (value) => {
  if (!value) return null;
  return value._id ? value._id.toString() : value.toString();
};

const parseCoordinate = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const assertValidLocation = ({ latitude, longitude, accuracy }) => {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);
  const acc = accuracy === undefined || accuracy === null ? null : Number(accuracy);

  if (!geoUtils.isValidCoordinates(lat, lng)) {
    const error = new Error('Invalid latitude or longitude');
    error.statusCode = 400;
    throw error;
  }

  if (acc !== null && (!Number.isFinite(acc) || acc < 0)) {
    const error = new Error('Invalid accuracy');
    error.statusCode = 400;
    throw error;
  }

  return { latitude: lat, longitude: lng, accuracy: acc };
};

const buildApplicableGeofenceFilter = (user) => {
  return buildScopedApplicableGeofenceFilter(user, { isActive: true });
};

const findContainingGeofences = async (user, latitude, longitude) => {
  const geofences = await Geofence.find(buildApplicableGeofenceFilter(user));

  return geofences
    .map((geofence) => {
      const result = geofence.containsPoint(longitude, latitude);
      return {
        geofence,
        distance: result.distance,
        isInside: result.isInside
      };
    })
    .filter((result) => result.isInside)
    .sort((a, b) => a.distance - b.distance);
};

const countApplicableGeofences = async (user) => {
  return Geofence.countDocuments(buildApplicableGeofenceFilter(user));
};

const evaluateMovementPermission = async (user, latitude, longitude, at) => {
  const permission = await MovementPermission.findActiveForTeacher(user._id, at);

  if (!permission) {
    return {
      permission: null,
      isInside: false,
      distance: null
    };
  }

  const [allowedLongitude, allowedLatitude] = permission.allowedLocation.coordinates;
  const distance = geoUtils.calculateDistance(
    { latitude, longitude },
    { latitude: allowedLatitude, longitude: allowedLongitude }
  );

  return {
    permission,
    isInside: distance <= permission.radius,
    distance
  };
};

const buildScopedLiveLocationFilter = (viewer, requested = {}) => {
  const filter = { ...requested };

  if (!viewer) return filter;
  if (isSuperAdmin(viewer) || viewer.role === 'manager') return filter;

  if (viewer.role === 'admin') {
    const collegeId = getUserCollegeId(viewer);
    if (collegeId) filter.college = collegeId;
    return filter;
  }

  if (viewer.role === 'hod') {
    const departmentId = getUserDepartmentId(viewer);
    if (departmentId) filter.department = departmentId;
    return filter;
  }

  filter.user = viewer._id;
  return filter;
};

const serializeLiveLocation = (liveLocation, userOverride) => {
  if (!liveLocation) return null;
  const doc = liveLocation.toObject ? liveLocation.toObject({ virtuals: true }) : liveLocation;
  const user = userOverride || doc.user;
  const coordinates = doc.location?.coordinates || [];

  return {
    id: doc._id,
    userId: toObjectIdString(user?._id || doc.user),
    teacher: user && typeof user === 'object' ? {
      id: toObjectIdString(user._id),
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      email: user.email,
      employeeId: user.employeeId,
      role: user.role,
      department: user.department,
      college: user.college,
      departmentRef: user.departmentRef
    } : null,
    latitude: coordinates[1],
    longitude: coordinates[0],
    accuracy: doc.accuracy,
    altitude: doc.altitude,
    heading: doc.heading,
    speed: doc.speed,
    source: doc.source,
    trackingSessionId: doc.trackingSessionId,
    insideGeofence: doc.insideGeofence,
    geofences: doc.geofences || [],
    insideTemporaryPermission: doc.insideTemporaryPermission,
    activePermission: doc.activePermission,
    permissionDistance: doc.permissionDistance,
    violation: doc.violation,
    violationReason: doc.violationReason,
    lastSeenAt: doc.lastSeenAt,
    updatedAt: doc.updatedAt
  };
};

const getBroadcastRooms = (user, liveLocation) => {
  const rooms = new Set(['admin-room', 'live-locations', `teacher:${user._id}`, `user:${user._id}`]);
  const collegeId = getUserCollegeId(user) || liveLocation.college;
  const departmentId = getUserDepartmentId(user) || liveLocation.department;

  if (collegeId) rooms.add(`college:${toObjectIdString(collegeId)}`);
  if (departmentId) rooms.add(`department:${toObjectIdString(departmentId)}`);

  return Array.from(rooms);
};

const emitLiveLocation = (io, user, liveLocation, payload, isNewViolation) => {
  if (!io) return;

  const data = payload || serializeLiveLocation(liveLocation, user);
  for (const room of getBroadcastRooms(user, liveLocation)) {
    io.to(room).emit('live-location:update', data);
  }

  // Only push a "left the geofence" alert on the enter->exit transition, not on
  // every subsequent location sample while still outside — otherwise a phone
  // reporting every 5-15s re-sends the same notification repeatedly (and a
  // single noisy/low-accuracy GPS fix can trigger a duplicate false alarm).
  if (data.violation && isNewViolation) {
    io.to(`user:${user._id}`).emit('teacher:geofence:violation', {
      message: data.violationReason,
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy
      },
      timestamp: data.lastSeenAt
    });
  }
};

const shouldLogViolation = (previous, violation) => {
  if (!violation) return false;
  if (!previous) return true;
  if (!previous.violation) return true;
  if (!previous.lastViolationAt) return true;
  return Date.now() - previous.lastViolationAt.getTime() > VIOLATION_LOG_WINDOW_MS;
};

const processTeacherLocation = async ({ user, location, io, source = 'socket', requestContext = {} }) => {
  const { latitude, longitude, accuracy } = assertValidLocation(location);
  const timestamp = location.timestamp ? new Date(location.timestamp) : new Date();

  if (Number.isNaN(timestamp.getTime())) {
    const error = new Error('Invalid timestamp');
    error.statusCode = 400;
    throw error;
  }

  const applicableGeofenceCount = await countApplicableGeofences(user);
  const containing = await findContainingGeofences(user, latitude, longitude);
  const permissionState = await evaluateMovementPermission(user, latitude, longitude, timestamp);
  const insideGeofence = containing.length > 0;
  const hasAccurateEnoughFix = accuracy === null || accuracy <= DEFAULT_MAX_ACCURACY_METERS;
  const insideTemporaryPermission = permissionState.isInside;
  const violation = hasAccurateEnoughFix && applicableGeofenceCount > 0 && !insideGeofence && !insideTemporaryPermission;
  const violationReason = violation
    ? `Teacher is outside assigned geofence and no approved movement permission covers this location.`
    : null;

  const college = getUserCollegeId(user);
  const department = getUserDepartmentId(user);
  const previous = await LiveLocation.findOne({ user: user._id });
  const shouldAuditViolation = shouldLogViolation(previous, violation);
  const lastViolationAt = shouldAuditViolation ? new Date() : previous?.lastViolationAt;

  const liveLocation = await LiveLocation.findOneAndUpdate(
    { user: user._id },
    {
      user: user._id,
      college,
      department,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      accuracy,
      altitude: location.altitude,
      heading: location.heading,
      speed: location.speed,
      source,
      trackingSessionId: location.trackingSessionId,
      insideGeofence,
      geofences: containing.map(({ geofence, distance }) => ({
        geofence: geofence._id,
        name: geofence.name,
        distance,
        radius: geofence.radius
      })),
      insideTemporaryPermission,
      activePermission: permissionState.permission?._id,
      permissionDistance: permissionState.distance,
      violation,
      violationReason,
      lastViolationAt,
      lastSeenAt: timestamp
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await LiveLocationHistory.create({
    user: user._id,
    college,
    department,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    accuracy,
    altitude: location.altitude,
    heading: location.heading,
    speed: location.speed,
    source,
    trackingSessionId: location.trackingSessionId,
    insideGeofence,
    insideTemporaryPermission,
    activePermission: permissionState.permission?._id,
    violation,
    violationReason,
    timestamp
  });

  await User.updateOne(
    { _id: user._id },
    {
      trackingStatus: violation ? 'outside_geofence' : 'online',
      trackingEnabled: true
    }
  );

  if (shouldAuditViolation) {
    await Event.log({
      eventType: 'location.geofence-violation',
      actor: user._id,
      target: user._id,
      resource: { type: 'live-location', id: liveLocation._id },
      severity: 'warning',
      status: 'warning',
      details: {
        latitude,
        longitude,
        accuracy,
        insideGeofence,
        insideTemporaryPermission,
        reason: violationReason
      },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent
    });
  }

  if (AUDIT_EVERY_LIVE_UPDATE) {
    await Event.log({
      eventType: 'location.live-update',
      actor: user._id,
      target: user._id,
      resource: { type: 'live-location', id: liveLocation._id },
      severity: violation ? 'warning' : 'info',
      status: violation ? 'warning' : 'success',
      details: {
        latitude,
        longitude,
        accuracy,
        source,
        violation
      },
      ipAddress: requestContext.ip,
      userAgent: requestContext.userAgent
    });
  }

  const isNewViolation = violation && !previous?.violation;
  const payload = serializeLiveLocation(liveLocation, user);
  emitLiveLocation(io, user, liveLocation, payload, isNewViolation);

  return {
    liveLocation,
    payload,
    validation: {
      insideGeofence,
      insideTemporaryPermission,
      violation,
      violationReason,
      accuracyAccepted: hasAccurateEnoughFix,
      applicableGeofenceCount,
      activePermission: permissionState.permission,
      permissionDistance: permissionState.distance
    }
  };
};

const listLiveLocations = async (viewer, options = {}) => {
  if (!canViewLiveTracking(viewer) && viewer.role !== 'teacher' && viewer.role !== 'staff') {
    const error = new Error('Not authorized to view live tracking');
    error.statusCode = 403;
    throw error;
  }

  const { department, college, activeWithinMinutes = 15, violation } = options;
  const filter = {};

  if (department) filter.department = department;
  if (college) filter.college = college;
  if (violation !== undefined) filter.violation = violation === true || violation === 'true';
  if (activeWithinMinutes) {
    filter.lastSeenAt = {
      $gte: new Date(Date.now() - Number(activeWithinMinutes) * 60 * 1000)
    };
  }

  const scopedFilter = buildScopedLiveLocationFilter(viewer, filter);

  const locations = await LiveLocation.find(scopedFilter)
    .populate('user', 'firstName lastName email employeeId role department college departmentRef trackingStatus')
    .populate('college', 'name code')
    .populate('department', 'name code')
    .sort({ lastSeenAt: -1 });

  return locations.map((location) => serializeLiveLocation(location));
};

const getTeacherTrail = async (viewer, teacherId, options = {}) => {
  const scopedFilter = buildScopedLiveLocationFilter(viewer, { user: teacherId });

  if (scopedFilter.user?.toString && scopedFilter.user.toString() !== teacherId.toString()) {
    const error = new Error('Not authorized to view this teacher trail');
    error.statusCode = 403;
    throw error;
  }

  const { startTime, endTime, limit = 500 } = options;
  const filter = { user: teacherId };

  if (scopedFilter.college) filter.college = scopedFilter.college;
  if (scopedFilter.department) filter.department = scopedFilter.department;

  if (startTime || endTime) {
    filter.timestamp = {};
    if (startTime) filter.timestamp.$gte = new Date(startTime);
    if (endTime) filter.timestamp.$lte = new Date(endTime);
  }

  const teacher = await User.findById(teacherId).select('firstName lastName email employeeId role department college departmentRef');
  if (!teacher) {
    const error = new Error('Teacher not found');
    error.statusCode = 404;
    throw error;
  }

  const scopedTeacherLocation = buildScopedLiveLocationFilter(viewer, {
    college: getUserCollegeId(teacher),
    department: getUserDepartmentId(teacher)
  });

  if (viewer.role === 'admin' && scopedTeacherLocation.college && toObjectIdString(scopedTeacherLocation.college) !== toObjectIdString(getUserCollegeId(teacher))) {
    const error = new Error('Not authorized to view this teacher trail');
    error.statusCode = 403;
    throw error;
  }

  if (viewer.role === 'hod' && scopedTeacherLocation.department && toObjectIdString(scopedTeacherLocation.department) !== toObjectIdString(getUserDepartmentId(teacher))) {
    const error = new Error('Not authorized to view this teacher trail');
    error.statusCode = 403;
    throw error;
  }

  const points = await LiveLocationHistory.find(filter)
    .sort({ timestamp: -1 })
    .limit(Math.min(Number(limit) || 500, 2000));

  return {
    teacher,
    points: points.reverse().map((point) => ({
      id: point._id,
      latitude: point.location.coordinates[1],
      longitude: point.location.coordinates[0],
      accuracy: point.accuracy,
      heading: point.heading,
      speed: point.speed,
      insideGeofence: point.insideGeofence,
      insideTemporaryPermission: point.insideTemporaryPermission,
      violation: point.violation,
      violationReason: point.violationReason,
      timestamp: point.timestamp
    }))
  };
};

const stopTeacherTracking = async (userId) => {
  await User.updateOne(
    { _id: userId },
    {
      trackingStatus: 'offline',
      trackingEnabled: false
    }
  );
};

module.exports = {
  processTeacherLocation,
  listLiveLocations,
  getTeacherTrail,
  stopTeacherTracking,
  serializeLiveLocation,
  buildScopedLiveLocationFilter
};
