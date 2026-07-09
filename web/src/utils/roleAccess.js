// HOD gets a restricted panel: employees, attendance, live tracking,
// movement permissions, and geofences only — no Dashboard, Departments,
// Reports, Work Schedule, or Settings. Every other role is unrestricted here
// (page-level admin/manager checks still apply within individual pages).
export const HOD_ALLOWED_PATHS = [
  '/employees',
  '/attendance',
  '/live-tracking',
  '/movement-permissions',
  '/geofences',
];

export const HOD_DEFAULT_PATH = '/employees';

export const isPathAllowedForRole = (role, path) => {
  if (role !== 'hod') return true;
  return HOD_ALLOWED_PATHS.includes(path);
};
