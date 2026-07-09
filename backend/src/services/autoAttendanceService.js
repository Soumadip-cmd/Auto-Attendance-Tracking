const moment = require('moment-timezone');
const { Attendance, Event, Geofence } = require('../models');
const { geofenceAppliesToUser } = require('../utils/geofenceScope');
const notificationService = require('./notificationService');

// Push notifications are best-effort — a delivery failure (missing token,
// Expo/FCM outage) must never block the attendance record itself from
// being created.
const notifyBestEffort = (promise) => {
  Promise.resolve(promise).catch((error) => {
    console.warn('Failed to send auto attendance push notification:', error?.message);
  });
};

const DEFAULT_TIMEZONE = 'Asia/Kolkata';
const DEFAULT_START_TIME = '09:00';
const DEFAULT_END_TIME = '18:00';
const DEFAULT_GRACE_MINUTES = 15;
const MAX_ENTER_DISTANCE_BUFFER_METERS = 75;
const MINUTES_PER_DAY = 24 * 60;
const OPEN_ATTENDANCE_LOOKBACK_MS = 36 * 60 * 60 * 1000;
// Background location fixes can sit in the OS batching buffer (deferredUpdatesInterval)
// and arrive minutes after they were actually captured, still carrying their original
// capture timestamp. Using that stale timestamp verbatim backdates the check-in to
// before the user actually walked in. If a fix is older than this by the time it's
// reconciled, treat "now" (when we actually processed it) as the event time instead.
const MAX_LOCATION_EVENT_SKEW_MS = 3 * 60 * 1000;

const normalizeEventType = (eventType) => (eventType === 'exit' ? 'exit' : 'enter');

const eventTime = (timestamp) => {
  const parsed = timestamp ? new Date(timestamp) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const timezoneForGeofence = (geofence) => geofence?.workingHours?.timezone || DEFAULT_TIMEZONE;

const dateKeyFor = (date, timezone) => moment(date).tz(timezone).startOf('day').toDate();

const parseMinutes = (value, fallback) => {
  if (typeof value !== 'string' || !value.includes(':')) return fallback;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return fallback;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;
  return hours * 60 + minutes;
};

const getScheduleEntryForDay = (workingHours, day) => {
  const schedule = workingHours?.schedule;

  if (Array.isArray(schedule)) {
    const item = schedule.find((entry) => entry.day === day);
    if (!item) return null;
    return {
      enabled: item.enabled !== false,
      startTime: item.startTime || item.start,
      endTime: item.endTime || item.end,
    };
  }

  if (schedule && typeof schedule === 'object' && schedule[day]) {
    const item = schedule[day];
    return {
      enabled: item.enabled !== false,
      startTime: item.startTime || item.start,
      endTime: item.endTime || item.end,
    };
  }

  return null;
};

const buildWorkingWindowForLocalDay = (geofence, localDay, timezone) => {
  const workingHours = geofence?.workingHours || {};
  const scheduled = workingHours.enabled
    ? getScheduleEntryForDay(workingHours, localDay.format('dddd').toLowerCase())
    : null;
  const gracePeriod = Number.isFinite(Number(workingHours.gracePeriod))
    ? Number(workingHours.gracePeriod)
    : DEFAULT_GRACE_MINUTES;

  if (scheduled && scheduled.enabled === false) {
    return {
      timezone,
      enabledToday: false,
      startTime: DEFAULT_START_TIME,
      endTime: DEFAULT_END_TIME,
      gracePeriod,
      expectedHours: 9,
      dateKey: localDay.clone().startOf('day').toDate(),
    };
  }

  const startTime = scheduled?.startTime || workingHours.startTime || DEFAULT_START_TIME;
  const endTime = scheduled?.endTime || workingHours.endTime || DEFAULT_END_TIME;
  const startMinutes = parseMinutes(startTime, parseMinutes(DEFAULT_START_TIME));
  const endMinutes = parseMinutes(endTime, parseMinutes(DEFAULT_END_TIME));
  const crossesMidnight = endMinutes <= startMinutes;
  const expectedMinutes = crossesMidnight
    ? (MINUTES_PER_DAY - startMinutes) + endMinutes
    : endMinutes - startMinutes;
  const startsAt = localDay.clone().startOf('day').add(startMinutes, 'minutes');
  const endsAt = localDay.clone().startOf('day').add(endMinutes, 'minutes');
  if (crossesMidnight) endsAt.add(1, 'day');

  const checkInOpensAt = startsAt.clone().subtract(gracePeriod, 'minutes');
  const checkInClosesAt = endsAt.clone().add(gracePeriod, 'minutes');
  const checkoutOpensAt = endsAt.clone().subtract(gracePeriod, 'minutes');
  const checkoutClosesAt = endsAt.clone().add(gracePeriod, 'minutes');
  const lateAfter = startsAt.clone().add(gracePeriod, 'minutes');

  return {
    timezone,
    enabledToday: true,
    startTime,
    endTime,
    startMinutes,
    endMinutes,
    gracePeriod,
    crossesMidnight,
    dateKey: localDay.clone().startOf('day').toDate(),
    startsAt: startsAt.toDate(),
    endsAt: endsAt.toDate(),
    checkInOpensAt: checkInOpensAt.toDate(),
    checkInClosesAt: checkInClosesAt.toDate(),
    checkoutOpensAt: checkoutOpensAt.toDate(),
    checkoutClosesAt: checkoutClosesAt.toDate(),
    lateAfter: lateAfter.toDate(),
    expectedHours: expectedMinutes > 0 ? expectedMinutes / 60 : 9,
  };
};

const getWorkingWindow = (geofence, date) => {
  const timezone = timezoneForGeofence(geofence);
  const local = moment(date).tz(timezone);
  const today = local.clone().startOf('day');
  const yesterday = today.clone().subtract(1, 'day');
  const windows = [
    buildWorkingWindowForLocalDay(geofence, today, timezone),
    buildWorkingWindowForLocalDay(geofence, yesterday, timezone),
  ];

  return windows.find((window) => (
    window.enabledToday &&
    local.toDate() >= window.checkInOpensAt &&
    local.toDate() <= window.checkInClosesAt
  )) || windows[0];
};

const buildEventId = ({ user, geofenceId, eventType, timestamp }) => {
  const time = eventTime(timestamp).toISOString();
  return `${user._id}:${geofenceId}:${normalizeEventType(eventType)}:${time}`;
};

const buildLocationEventId = ({ user, geofenceId, eventType, timestamp }) => {
  const time = eventTime(timestamp).toISOString();
  return `${user._id}:${geofenceId}:location:${normalizeEventType(eventType)}:${time}`;
};

const formatLocalTime = (date, timezone) => moment(date).tz(timezone).format('HH:mm');

const findOpenAttendance = async (user, eventAt) => {
  const earliest = new Date(eventAt.getTime() - OPEN_ATTENDANCE_LOOKBACK_MS);
  return Attendance.findOne({
    user: user._id,
    'checkIn.time': { $exists: true, $ne: null, $lte: eventAt, $gte: earliest },
    $or: [
      { 'checkOut.time': { $exists: false } },
      { 'checkOut.time': null },
    ],
  }).sort({ 'checkIn.time': -1 });
};

const logGeofenceEvent = async ({ req, user, geofence, eventType, latitude, longitude, timestamp, eventId }) => {
  const normalizedType = normalizeEventType(eventType);
  const eventTypeName = normalizedType === 'exit' ? 'geofence.exited' : 'geofence.entered';

  if (eventId) {
    const existing = await Event.findOne({
      actor: user._id,
      eventType: eventTypeName,
      'details.eventId': eventId,
    });
    if (existing) return existing;
  }

  return Event.log({
    eventType: eventTypeName,
    actor: user._id,
    target: user._id,
    resource: geofence ? { type: 'geofence', id: geofence._id } : undefined,
    severity: normalizedType === 'exit' ? 'warning' : 'info',
    status: normalizedType === 'exit' ? 'warning' : 'success',
    details: {
      eventId,
      geofenceName: geofence?.name,
      latitude,
      longitude,
      timestamp: timestamp || new Date(),
    },
    ipAddress: req?.ip,
    userAgent: req?.get?.('user-agent'),
  });
};

const emitAttendance = (io, eventName, user, attendance, time) => {
  if (!io) return;

  io.to('admin-room').emit(eventName, {
    userId: user._id,
    userName: `${user.firstName} ${user.lastName}`,
    time,
    method: 'automatic',
    duration: attendance?.duration,
  });

  // Also tell the teacher's own app — auto check-in/out happens via a
  // background/native path that bypasses the mobile app's normal
  // post-check-in state update, so without this the Home screen (and
  // anywhere else showing today's attendance) stays stale until the user
  // manually pulls to refresh. The mobile app already listens for this
  // exact event name to re-fetch today's attendance.
  io.to(`user:${user._id}`).emit('attendance:updated', {
    userId: user._id,
    eventType: eventName,
    time,
    method: 'automatic',
    attendance,
  });
};

const emitGeofence = ({ io, user, geofence, eventType, latitude, longitude, timestamp }) => {
  if (!io) return;

  const payload = {
    userId: user._id,
    teacher: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      employeeId: user.employeeId,
    },
    geofence: geofence ? {
      id: geofence._id,
      name: geofence.name,
      radius: geofence.radius,
      coordinates: {
        latitude: geofence.center.coordinates[1],
        longitude: geofence.center.coordinates[0],
      },
    } : null,
    eventType,
    latitude,
    longitude,
    timestamp: timestamp || new Date(),
  };

  io.to('admin-room').emit('teacher:geofence:event', payload);
  io.to(`user:${user._id}`).emit('teacher:geofence:event', payload);
};

const validateGeofenceForUser = async ({ user, geofenceId, latitude, longitude, eventType }) => {
  const geofence = await Geofence.findById(geofenceId);
  if (!geofence || !geofence.isActive) {
    const error = new Error('Active geofence not found');
    error.statusCode = 404;
    throw error;
  }

  if (!geofenceAppliesToUser(geofence, user)) {
    const error = new Error('This geofence is not assigned to the current user');
    error.statusCode = 403;
    throw error;
  }

  if (eventType === 'enter' && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
    const result = geofence.containsPoint(Number(longitude), Number(latitude));
    if (result.distance > geofence.radius + MAX_ENTER_DISTANCE_BUFFER_METERS) {
      const error = new Error('Enter event is outside the assigned geofence');
      error.statusCode = 400;
      throw error;
    }
  }

  return geofence;
};

const autoCheckIn = async ({ user, geofence, latitude, longitude, eventAt, eventId, io }) => {
  if (!geofence.autoAttendance?.checkIn) {
    return { action: 'checkin', skipped: true, reason: 'Auto check-in is not enabled for this geofence' };
  }

  const window = getWorkingWindow(geofence, eventAt);
  if (!window.enabledToday) {
    return { action: 'checkin', skipped: true, reason: 'Auto check-in is disabled for this work day' };
  }

  if (eventAt < window.checkInOpensAt) {
    return {
      action: 'checkin',
      skipped: true,
      reason: `Before auto check-in window (${formatLocalTime(window.checkInOpensAt, window.timezone)})`,
    };
  }

  if (eventAt > window.checkInClosesAt) {
    return {
      action: 'checkin',
      skipped: true,
      reason: `After auto check-in window (${formatLocalTime(window.checkInClosesAt, window.timezone)})`,
    };
  }

  const dateKey = window.dateKey || dateKeyFor(eventAt, window.timezone);
  const existing = await Attendance.findOne({ user: user._id, date: dateKey });
  if (existing?.checkIn?.time) {
    return { action: 'checkin', skipped: true, reason: 'Already checked in for this attendance day', attendance: existing };
  }

  const isLate = eventAt > window.lateAfter;
  const lateBy = isLate ? Math.max(0, Math.round((eventAt - window.startsAt) / (1000 * 60))) : 0;

  let attendance;
  try {
    attendance = await Attendance.create({
      user: user._id,
      date: dateKey,
      checkIn: {
        time: eventAt,
        location: Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) ? {
          type: 'Point',
          coordinates: [Number(longitude), Number(latitude)],
        } : undefined,
        method: 'automatic',
        geofence: geofence._id,
        eventId,
      },
      status: isLate ? 'late' : 'present',
      isLate,
      lateBy,
      expectedHours: window.expectedHours,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    attendance = await Attendance.findOne({ user: user._id, date: dateKey });
    return { action: 'checkin', skipped: true, reason: 'Already checked in for this attendance day', attendance };
  }

  emitAttendance(io, 'attendance:checkin', user, attendance, eventAt);
  notifyBestEffort(notificationService.sendAutoCheckInNotification(user._id, eventAt));
  return { action: 'checkin', skipped: false, attendance };
};

const autoCheckOut = async ({ user, geofence, latitude, longitude, eventAt, eventId, io }) => {
  if (!geofence.autoAttendance?.checkOut) {
    return { action: 'checkout', skipped: true, reason: 'Auto check-out is not enabled for this geofence' };
  }

  const attendance = await findOpenAttendance(user, eventAt);

  if (!attendance) {
    return { action: 'checkout', skipped: true, reason: 'No active check-in found for this user' };
  }

  const attendanceWindow = getWorkingWindow(geofence, attendance.checkIn.time || eventAt);

  // Leaving campus briefly during the workday (lunch, a supply run, etc.)
  // shouldn't end the attendance session — only finalize the checkout once
  // it's actually at/after the scheduled end time. The separate geofence
  // violation alert already warns that they're outside during work hours;
  // this just stops that from also silently closing out their day. If they
  // re-enter later, autoCheckIn sees the still-open check-in and leaves it be.
  if (attendanceWindow.enabledToday && eventAt < attendanceWindow.checkoutOpensAt) {
    return {
      action: 'checkout',
      skipped: true,
      reason: `Left before allowed check-out time (${formatLocalTime(attendanceWindow.checkoutOpensAt, attendanceWindow.timezone)}) - still marked present, not checked out`,
      attendance,
    };
  }

  attendance.checkOut = {
    time: eventAt,
    location: Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) ? {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    } : undefined,
    method: 'automatic',
    geofence: geofence._id,
    eventId,
  };

  const durationMs = eventAt - new Date(attendance.checkIn.time);
  attendance.duration = Math.max(0, Math.round(durationMs / (1000 * 60)));
  attendance.actualHours = Math.round((attendance.duration / 60) * 100) / 100;

  await attendance.save();
  emitAttendance(io, 'attendance:checkout', user, attendance, eventAt);
  notifyBestEffort(notificationService.sendAutoCheckOutNotification(user._id, eventAt));
  return { action: 'checkout', skipped: false, attendance };
};

const normalizeContainingGeofences = (containingGeofences = []) => {
  return containingGeofences
    .map((item) => item?.geofence || item)
    .filter(Boolean);
};

const reconcileAutoAttendanceFromLocation = async ({
  user,
  latitude,
  longitude,
  timestamp,
  containingGeofences = [],
  io,
}) => {
  const rawEventAt = eventTime(timestamp);
  const eventAt = Date.now() - rawEventAt.getTime() > MAX_LOCATION_EVENT_SKEW_MS
    ? new Date()
    : rawEventAt;
  const insideGeofences = normalizeContainingGeofences(containingGeofences);
  let firstSkipped = null;

  for (const geofence of insideGeofences) {
    if (!geofence.autoAttendance?.checkIn) continue;

    const result = await autoCheckIn({
      user,
      geofence,
      latitude,
      longitude,
      eventAt,
      eventId: buildLocationEventId({
        user,
        geofenceId: geofence._id,
        eventType: 'enter',
        timestamp: eventAt,
      }),
      io,
    });

    if (!result.skipped) {
      return { eventType: 'enter', geofence, attendance: result };
    }

    firstSkipped = firstSkipped || { eventType: 'enter', geofence, attendance: result };
  }

  if (insideGeofences.length === 0) {
    const attendance = await findOpenAttendance(user, eventAt);
    const geofenceId = attendance?.checkIn?.geofence;
    const geofence = geofenceId ? await Geofence.findById(geofenceId) : null;

    if (geofence && geofence.isActive && geofenceAppliesToUser(geofence, user)) {
      const result = await autoCheckOut({
        user,
        geofence,
        latitude,
        longitude,
        eventAt,
        eventId: buildLocationEventId({
          user,
          geofenceId: geofence._id,
          eventType: 'exit',
          timestamp: eventAt,
        }),
        io,
      });

      return { eventType: 'exit', geofence, attendance: result };
    }
  }

  return firstSkipped;
};

const processGeofenceTransition = async ({
  req,
  user,
  geofenceId,
  eventType,
  latitude,
  longitude,
  timestamp,
  eventId,
  io,
}) => {
  const normalizedType = normalizeEventType(eventType);
  const eventAt = eventTime(timestamp);
  const stableEventId = eventId || buildEventId({ user, geofenceId, eventType: normalizedType, timestamp: eventAt });
  const geofence = await validateGeofenceForUser({
    user,
    geofenceId,
    latitude,
    longitude,
    eventType: normalizedType,
  });

  const event = await logGeofenceEvent({
    req,
    user,
    geofence,
    eventType: normalizedType,
    latitude,
    longitude,
    timestamp: eventAt,
    eventId: stableEventId,
  });

  emitGeofence({
    io,
    user,
    geofence,
    eventType: normalizedType,
    latitude,
    longitude,
    timestamp: eventAt,
  });

  const attendance = normalizedType === 'enter'
    ? await autoCheckIn({ user, geofence, latitude, longitude, eventAt, eventId: stableEventId, io })
    : await autoCheckOut({ user, geofence, latitude, longitude, eventAt, eventId: stableEventId, io });

  return {
    event,
    attendance,
    eventId: stableEventId,
    geofence,
  };
};

module.exports = {
  processGeofenceTransition,
  reconcileAutoAttendanceFromLocation,
  dateKeyFor,
  getWorkingWindow,
};
