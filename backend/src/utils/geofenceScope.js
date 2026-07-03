const { getUserCollegeId, getUserDepartmentId } = require('./roleUtils');

const toObjectIdString = (value) => {
  if (!value) return null;
  return value._id ? value._id.toString() : value.toString();
};

const includesObjectId = (values = [], target) => {
  const targetId = toObjectIdString(target);
  if (!targetId || !Array.isArray(values)) return false;
  return values.some((value) => toObjectIdString(value) === targetId);
};

const isEmptyObjectIdArray = (values) => !Array.isArray(values) || values.length === 0;

const geofenceAppliesToUser = (geofence, user) => {
  if (!geofence || !user) return false;

  const assignedUsers = geofence.assignedUsers || [];
  if (!isEmptyObjectIdArray(assignedUsers)) {
    return includesObjectId(assignedUsers, user._id);
  }

  const geofenceDepartment = toObjectIdString(geofence.department);
  const userDepartment = toObjectIdString(getUserDepartmentId(user));
  if (geofenceDepartment) {
    return geofenceDepartment === userDepartment;
  }

  const geofenceCollege = toObjectIdString(geofence.college);
  const userCollege = toObjectIdString(getUserCollegeId(user));
  if (geofenceCollege) {
    return geofenceCollege === userCollege;
  }

  return true;
};

const buildApplicableGeofenceFilter = (user, baseFilter = {}) => {
  const filter = { ...baseFilter };
  const baseOr = filter.$or;
  delete filter.$or;
  const collegeId = getUserCollegeId(user);
  const departmentId = getUserDepartmentId(user);
  const userId = user?._id;

  const unassigned = [
    { assignedUsers: { $exists: false } },
    { assignedUsers: { $size: 0 } },
    { assignedUsers: null },
  ];

  const scope = [];
  if (userId) scope.push({ assignedUsers: userId });

  if (departmentId) {
    scope.push({
      $and: [
        { $or: unassigned },
        { department: departmentId },
      ],
    });
  }

  if (collegeId) {
    scope.push({
      $and: [
        { $or: unassigned },
        { $or: [{ department: { $exists: false } }, { department: null }] },
        { college: collegeId },
      ],
    });
  }

  scope.push({
    $and: [
      { $or: unassigned },
      { $or: [{ department: { $exists: false } }, { department: null }] },
      { $or: [{ college: { $exists: false } }, { college: null }] },
    ],
  });

  const scopedFilter = {
    $and: [
      filter,
      { $or: scope },
    ],
  };

  if (baseOr) {
    scopedFilter.$and.push({ $or: baseOr });
  }

  return scopedFilter;
};

module.exports = {
  toObjectIdString,
  geofenceAppliesToUser,
  buildApplicableGeofenceFilter,
};
