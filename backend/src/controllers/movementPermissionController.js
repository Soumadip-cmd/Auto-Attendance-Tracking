const { asyncHandler } = require('../middleware/errorHandler');
const { Event, MovementPermission, User } = require('../models');
const { getUserCollegeId, getUserDepartmentId, isAdminLike, isHod } = require('../utils/roleUtils');

const canDecidePermission = (actor, permission) => {
  if (isAdminLike(actor)) return true;
  if (!isHod(actor)) return false;

  const actorDepartment = getUserDepartmentId(actor);
  return actorDepartment &&
    permission.department &&
    actorDepartment.toString() === permission.department.toString();
};

const buildListFilter = (user, query = {}) => {
  const filter = {};

  if (query.status) filter.status = query.status;
  if (query.teacher) filter.teacher = query.teacher;

  if (isAdminLike(user)) {
    const collegeId = getUserCollegeId(user);
    if (user.role === 'admin' && collegeId) filter.college = collegeId;
    return filter;
  }

  if (isHod(user)) {
    const departmentId = getUserDepartmentId(user);
    if (departmentId) filter.department = departmentId;
    return filter;
  }

  filter.teacher = user._id;
  return filter;
};

exports.createRequest = asyncHandler(async (req, res) => {
  const {
    reason,
    latitude,
    longitude,
    radius = 100,
    startTime,
    endTime
  } = req.body;

  const permission = await MovementPermission.create({
    teacher: req.user._id,
    college: getUserCollegeId(req.user),
    department: getUserDepartmentId(req.user),
    reason,
    allowedLocation: {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)]
    },
    radius,
    startTime,
    endTime,
    createdBy: req.user._id
  });

  await Event.log({
    eventType: 'movement-permission.requested',
    actor: req.user._id,
    target: req.user._id,
    resource: { type: 'movement-permission', id: permission._id },
    details: {
      reason,
      latitude,
      longitude,
      radius,
      startTime,
      endTime
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    data: permission
  });
});

exports.getRequests = asyncHandler(async (req, res) => {
  const filter = buildListFilter(req.user, req.query);
  const requests = await MovementPermission.find(filter)
    .populate('teacher', 'firstName lastName email employeeId department role')
    .populate('approvedBy', 'firstName lastName email')
    .populate('rejectedBy', 'firstName lastName email')
    .populate('college', 'name code')
    .populate('department', 'name code')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: requests.length,
    data: requests
  });
});

exports.getRequestById = asyncHandler(async (req, res) => {
  const permission = await MovementPermission.findById(req.params.id)
    .populate('teacher', 'firstName lastName email employeeId department role')
    .populate('approvedBy', 'firstName lastName email')
    .populate('rejectedBy', 'firstName lastName email')
    .populate('college', 'name code')
    .populate('department', 'name code');

  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Movement permission not found'
    });
  }

  if (!isAdminLike(req.user) && !canDecidePermission(req.user, permission) && permission.teacher._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this movement permission'
    });
  }

  res.json({
    success: true,
    data: permission
  });
});

exports.approveRequest = asyncHandler(async (req, res) => {
  const permission = await MovementPermission.findById(req.params.id);

  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Movement permission not found'
    });
  }

  if (!canDecidePermission(req.user, permission)) {
    return res.status(403).json({
      success: false,
      message: 'Only super admin/admin or the department HOD can approve this request'
    });
  }

  const { radius, endTime, decisionNotes } = req.body;

  if (radius) permission.radius = radius;
  if (endTime) permission.endTime = endTime;
  permission.status = 'approved';
  permission.approvedBy = req.user._id;
  permission.approvedAt = new Date();
  permission.decisionNotes = decisionNotes;

  await permission.save();

  await Event.log({
    eventType: 'movement-permission.approved',
    actor: req.user._id,
    target: permission.teacher,
    resource: { type: 'movement-permission', id: permission._id },
    details: {
      radius: permission.radius,
      startTime: permission.startTime,
      endTime: permission.endTime,
      decisionNotes
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${permission.teacher}`).emit('movement-permission:approved', {
      id: permission._id,
      radius: permission.radius,
      startTime: permission.startTime,
      endTime: permission.endTime,
      decisionNotes
    });
  }

  res.json({
    success: true,
    data: permission
  });
});

exports.rejectRequest = asyncHandler(async (req, res) => {
  const permission = await MovementPermission.findById(req.params.id);

  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Movement permission not found'
    });
  }

  if (!canDecidePermission(req.user, permission)) {
    return res.status(403).json({
      success: false,
      message: 'Only super admin/admin or the department HOD can reject this request'
    });
  }

  permission.status = 'rejected';
  permission.rejectedBy = req.user._id;
  permission.rejectedAt = new Date();
  permission.decisionNotes = req.body.decisionNotes;

  await permission.save();

  await Event.log({
    eventType: 'movement-permission.rejected',
    actor: req.user._id,
    target: permission.teacher,
    resource: { type: 'movement-permission', id: permission._id },
    details: {
      decisionNotes: req.body.decisionNotes
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${permission.teacher}`).emit('movement-permission:rejected', {
      id: permission._id,
      decisionNotes: req.body.decisionNotes
    });
  }

  res.json({
    success: true,
    data: permission
  });
});

exports.cancelRequest = asyncHandler(async (req, res) => {
  const permission = await MovementPermission.findById(req.params.id);

  if (!permission) {
    return res.status(404).json({
      success: false,
      message: 'Movement permission not found'
    });
  }

  if (permission.teacher.toString() !== req.user._id.toString() && !isAdminLike(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this request'
    });
  }

  permission.status = 'cancelled';
  permission.decisionNotes = req.body.decisionNotes;
  await permission.save();

  await Event.log({
    eventType: 'movement-permission.cancelled',
    actor: req.user._id,
    target: permission.teacher,
    resource: { type: 'movement-permission', id: permission._id },
    details: {
      decisionNotes: req.body.decisionNotes
    },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    data: permission
  });
});
