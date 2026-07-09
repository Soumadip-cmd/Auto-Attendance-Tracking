const moment = require('moment-timezone');
const mongoose = require('mongoose');
const { Attendance, Geofence, User } = require('../../../src/models');
const {
  getWorkingWindow,
  reconcileAutoAttendanceFromLocation,
} = require('../../../src/services/autoAttendanceService');

const TZ = 'Asia/Kolkata';

const at = (value) => moment.tz(value, 'YYYY-MM-DD HH:mm', TZ).toDate();

const makeUser = () => User.create({
  email: `teacher-${Date.now()}-${Math.random()}@example.com`,
  password: 'password123',
  firstName: 'Test',
  lastName: 'Teacher',
  role: 'teacher',
  consentGiven: true,
  trackingEnabled: true,
});

const makeGeofence = (overrides = {}) => Geofence.create({
  name: `Office ${Date.now()}`,
  center: {
    type: 'Point',
    coordinates: [88.39102284246735, 22.826475818977666],
  },
  radius: 100,
  isActive: true,
  workingHours: {
    enabled: true,
    startTime: '10:31',
    endTime: '01:02',
    gracePeriod: 15,
    timezone: TZ,
  },
  autoAttendance: {
    checkIn: true,
    checkOut: true,
  },
  ...overrides,
});

describe('autoAttendanceService', () => {
  it('builds an overnight working window using the shift start date', async () => {
    const geofence = await makeGeofence();
    const window = getWorkingWindow(geofence, at('2026-07-10 00:50'));

    expect(window.crossesMidnight).toBe(true);
    expect(moment(window.dateKey).tz(TZ).format('YYYY-MM-DD')).toBe('2026-07-09');
    expect(moment(window.startsAt).tz(TZ).format('YYYY-MM-DD HH:mm')).toBe('2026-07-09 10:31');
    expect(moment(window.endsAt).tz(TZ).format('YYYY-MM-DD HH:mm')).toBe('2026-07-10 01:02');
    expect(moment(window.checkoutOpensAt).tz(TZ).format('YYYY-MM-DD HH:mm')).toBe('2026-07-10 00:47');
    expect(window.expectedHours).toBeCloseTo(14.516, 2);
  });

  it('uses live-location reconciliation to check in once the grace window opens', async () => {
    const user = await makeUser();
    const geofence = await makeGeofence();

    const early = await reconcileAutoAttendanceFromLocation({
      user,
      latitude: 22.826475818977666,
      longitude: 88.39102284246735,
      timestamp: at('2026-07-09 10:10'),
      containingGeofences: [geofence],
    });

    expect(early.attendance.skipped).toBe(true);
    expect(await Attendance.countDocuments({ user: user._id })).toBe(0);

    const onTime = await reconcileAutoAttendanceFromLocation({
      user,
      latitude: 22.826475818977666,
      longitude: 88.39102284246735,
      timestamp: at('2026-07-09 10:31'),
      containingGeofences: [geofence],
    });

    expect(onTime.attendance.skipped).toBe(false);
    const attendance = await Attendance.findOne({ user: user._id });
    expect(attendance).toBeTruthy();
    expect(moment(attendance.date).tz(TZ).format('YYYY-MM-DD')).toBe('2026-07-09');
    expect(attendance.checkIn.geofence.toString()).toBe(geofence._id.toString());
  });

  it('checks out from live-location reconciliation after checkout grace opens', async () => {
    const user = await makeUser();
    const geofence = await makeGeofence();

    await Attendance.create({
      user: user._id,
      date: moment.tz('2026-07-09', 'YYYY-MM-DD', TZ).startOf('day').toDate(),
      checkIn: {
        time: at('2026-07-09 10:31'),
        location: {
          type: 'Point',
          coordinates: [88.39102284246735, 22.826475818977666],
        },
        method: 'automatic',
        geofence: geofence._id,
        eventId: new mongoose.Types.ObjectId().toString(),
      },
      expectedHours: 14.5,
    });

    const beforeGrace = await reconcileAutoAttendanceFromLocation({
      user,
      latitude: 22.82,
      longitude: 88.39,
      timestamp: at('2026-07-10 00:40'),
      containingGeofences: [],
    });

    expect(beforeGrace.attendance.skipped).toBe(true);
    let attendance = await Attendance.findOne({ user: user._id });
    expect(attendance.checkOut.time).toBeFalsy();

    const duringGrace = await reconcileAutoAttendanceFromLocation({
      user,
      latitude: 22.82,
      longitude: 88.39,
      timestamp: at('2026-07-10 00:50'),
      containingGeofences: [],
    });

    expect(duringGrace.attendance.skipped).toBe(false);
    attendance = await Attendance.findOne({ user: user._id });
    expect(moment(attendance.checkOut.time).tz(TZ).format('YYYY-MM-DD HH:mm')).toBe('2026-07-10 00:50');
  });
});
