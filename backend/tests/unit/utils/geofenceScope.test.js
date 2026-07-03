const mongoose = require('mongoose');
const {
  buildApplicableGeofenceFilter,
  geofenceAppliesToUser,
} = require('../../../src/utils/geofenceScope');

const id = () => new mongoose.Types.ObjectId();

describe('Geofence scope utils', () => {
  describe('geofenceAppliesToUser', () => {
    it('uses assigned users before department or college matching', () => {
      const user = { _id: id(), college: id(), departmentRef: id() };
      const otherUserId = id();

      expect(geofenceAppliesToUser({
        assignedUsers: [otherUserId],
        college: user.college,
        department: user.departmentRef,
      }, user)).toBe(false);

      expect(geofenceAppliesToUser({
        assignedUsers: [user._id],
        college: id(),
        department: id(),
      }, user)).toBe(true);
    });

    it('matches department before falling back to college', () => {
      const user = { _id: id(), college: id(), departmentRef: id() };

      expect(geofenceAppliesToUser({
        assignedUsers: [],
        college: user.college,
        department: user.departmentRef,
      }, user)).toBe(true);

      expect(geofenceAppliesToUser({
        assignedUsers: [],
        college: user.college,
        department: id(),
      }, user)).toBe(false);
    });

    it('matches college geofences and global geofences when no narrower scope exists', () => {
      const user = { _id: id(), college: id(), departmentRef: id() };

      expect(geofenceAppliesToUser({
        assignedUsers: [],
        college: user.college,
      }, user)).toBe(true);

      expect(geofenceAppliesToUser({
        assignedUsers: [],
      }, user)).toBe(true);
    });
  });

  describe('buildApplicableGeofenceFilter', () => {
    it('combines active/base filters with user, department, college, and global scopes', () => {
      const user = { _id: id(), college: id(), departmentRef: id() };
      const filter = buildApplicableGeofenceFilter(user, {
        isActive: true,
        $or: [{ name: /main/i }, { type: 'campus' }],
      });

      expect(filter.$and[0]).toEqual({ isActive: true });
      expect(filter.$and[1].$or).toEqual(expect.arrayContaining([
        { assignedUsers: user._id },
        expect.objectContaining({
          $and: expect.arrayContaining([
            { department: user.departmentRef },
          ]),
        }),
        expect.objectContaining({
          $and: expect.arrayContaining([
            { college: user.college },
          ]),
        }),
      ]));
      expect(filter.$and[2]).toEqual({ $or: [{ name: /main/i }, { type: 'campus' }] });
    });
  });
});
