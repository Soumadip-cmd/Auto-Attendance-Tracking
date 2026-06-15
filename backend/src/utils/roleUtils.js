const ADMIN_ROLES = ['super_admin', 'admin', 'manager'];
const HOD_ROLES = ['hod'];
const TEACHER_ROLES = ['teacher', 'staff'];
const STUDENT_ROLES = ['student'];
const LIVE_TRACKING_VIEW_ROLES = ['super_admin', 'admin', 'manager', 'hod'];

const isSuperAdmin = (user) => user?.role === 'super_admin';
const isAdminLike = (user) => ADMIN_ROLES.includes(user?.role);
const isHod = (user) => HOD_ROLES.includes(user?.role);
const isTeacherLike = (user) => TEACHER_ROLES.includes(user?.role);
const canViewLiveTracking = (user) => LIVE_TRACKING_VIEW_ROLES.includes(user?.role);

const getUserCollegeId = (user) => user?.college?._id || user?.college || null;
const getUserDepartmentId = (user) => user?.departmentRef?._id || user?.departmentRef || null;

const buildScopedUserFilter = (viewer, baseFilter = {}) => {
  if (isSuperAdmin(viewer) || viewer?.role === 'manager') {
    return baseFilter;
  }

  const filter = { ...baseFilter };

  if (viewer?.role === 'admin') {
    const college = getUserCollegeId(viewer);
    if (college) filter.college = college;
    return filter;
  }

  if (isHod(viewer)) {
    const department = getUserDepartmentId(viewer);
    if (department) {
      filter.departmentRef = department;
    } else if (viewer?.department) {
      filter.department = viewer.department;
    }
    return filter;
  }

  filter._id = viewer?._id;
  return filter;
};

module.exports = {
  ADMIN_ROLES,
  HOD_ROLES,
  TEACHER_ROLES,
  STUDENT_ROLES,
  LIVE_TRACKING_VIEW_ROLES,
  isSuperAdmin,
  isAdminLike,
  isHod,
  isTeacherLike,
  canViewLiveTracking,
  getUserCollegeId,
  getUserDepartmentId,
  buildScopedUserFilter
};
