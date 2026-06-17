const { asyncHandler } = require('../middleware/errorHandler');
const { College, Department, Event, User } = require('../models');
const { getUserCollegeId, isSuperAdmin } = require('../utils/roleUtils');

const buildCollegeScope = (user, requestedCollege) => {
  if (isSuperAdmin(user)) {
    return requestedCollege ? { _id: requestedCollege } : {};
  }

  const collegeId = requestedCollege || getUserCollegeId(user);
  return collegeId ? { _id: collegeId } : {};
};

exports.createCollege = asyncHandler(async (req, res) => {
  const {
    name,
    code,
    address,
    latitude,
    longitude,
    phoneNumber,
    email,
    isActive
  } = req.body;

  const collegeData = {
    name,
    code,
    address,
    phoneNumber,
    email,
    isActive,
    createdBy: req.user._id,
  };
  if (latitude && longitude) {
    collegeData.location = {
      type: 'Point',
      coordinates: [Number(longitude), Number(latitude)],
    };
  }
  const college = await College.create(collegeData);

  await Event.log({
    eventType: 'college.created',
    actor: req.user._id,
    resource: { type: 'college', id: college._id },
    details: { name, code },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    data: college
  });
});

exports.getColleges = asyncHandler(async (req, res) => {
  const colleges = await College.find(buildCollegeScope(req.user, req.query.college))
    .sort({ name: 1 });

  res.json({
    success: true,
    count: colleges.length,
    data: colleges
  });
});

exports.updateCollege = asyncHandler(async (req, res) => {
  const college = await College.findOne(buildCollegeScope(req.user, req.params.id));

  if (!college) {
    return res.status(404).json({
      success: false,
      message: 'College not found'
    });
  }

  const allowedFields = ['name', 'code', 'address', 'phoneNumber', 'email', 'isActive'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) college[field] = req.body[field];
  });

  if (req.body.latitude && req.body.longitude) {
    college.location = {
      type: 'Point',
      coordinates: [Number(req.body.longitude), Number(req.body.latitude)]
    };
  }

  college.updatedBy = req.user._id;
  await college.save();

  await Event.log({
    eventType: 'college.updated',
    actor: req.user._id,
    resource: { type: 'college', id: college._id },
    details: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    data: college
  });
});

exports.createDepartment = asyncHandler(async (req, res) => {
  const {
    college,
    name,
    code,
    hod,
    description,
    defaultGeofences,
    isActive
  } = req.body;

  const scopedCollege = buildCollegeScope(req.user, college);
  const existingCollege = await College.findOne(scopedCollege);

  if (!existingCollege) {
    return res.status(404).json({
      success: false,
      message: 'College not found or not allowed'
    });
  }

  const department = await Department.create({
    college: existingCollege._id,
    name,
    code,
    hod,
    description,
    defaultGeofences,
    isActive,
    createdBy: req.user._id
  });

  if (hod) {
    await User.findByIdAndUpdate(hod, {
      role: 'hod',
      college: existingCollege._id,
      departmentRef: department._id,
      department: department.name,
      'permissions.canApproveMovementPermission': true
    });
  }

  await Event.log({
    eventType: 'department.created',
    actor: req.user._id,
    resource: { type: 'department', id: department._id },
    details: { name, code, college: existingCollege._id },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.status(201).json({
    success: true,
    data: department
  });
});

exports.getDepartments = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.college) {
    const college = await College.findOne(buildCollegeScope(req.user, req.query.college));
    if (!college) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this college'
      });
    }
    filter.college = college._id;
  } else if (!isSuperAdmin(req.user) && getUserCollegeId(req.user)) {
    filter.college = getUserCollegeId(req.user);
  }

  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  const departments = await Department.find(filter)
    .populate('college', 'name code')
    .populate('hod', 'firstName lastName email employeeId')
    .sort({ name: 1 });

  res.json({
    success: true,
    count: departments.length,
    data: departments
  });
});

exports.getTeachersInDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    return res.status(404).json({ success: false, message: 'Department not found' });
  }

  const teachers = await User.find({ departmentRef: department._id })
    .select('firstName lastName email employeeId role teacherCode isActive')
    .sort({ firstName: 1 });

  res.json({ success: true, count: teachers.length, data: teachers });
});

exports.assignTeacherToDepartment = asyncHandler(async (req, res) => {
  const { teacherId, action = 'assign' } = req.body;

  const department = await Department.findById(req.params.id).populate('college', 'name');
  if (!department) {
    return res.status(404).json({ success: false, message: 'Department not found' });
  }

  const teacher = await User.findById(teacherId);
  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Teacher not found' });
  }

  if (action === 'remove') {
    await User.findByIdAndUpdate(teacherId, {
      $unset: { departmentRef: '' },
      department: '',
    });
  } else {
    await User.findByIdAndUpdate(teacherId, {
      departmentRef: department._id,
      department: department.name,
      college: department.college._id || department.college,
    });
  }

  await Event.log({
    eventType: action === 'remove' ? 'department.teacher-removed' : 'department.teacher-assigned',
    actor: req.user._id,
    target: teacherId,
    resource: { type: 'department', id: department._id },
    details: { department: department.name },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.json({
    success: true,
    message: `Teacher ${action === 'remove' ? 'removed from' : 'assigned to'} department`,
  });
});

exports.updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: 'Department not found'
    });
  }

  if (!isSuperAdmin(req.user)) {
    const userCollege = getUserCollegeId(req.user);
    if (!userCollege || userCollege.toString() !== department.college.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this department'
      });
    }
  }

  const allowedFields = ['name', 'code', 'hod', 'description', 'defaultGeofences', 'isActive'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) department[field] = req.body[field];
  });

  department.updatedBy = req.user._id;
  await department.save();

  if (req.body.hod) {
    await User.findByIdAndUpdate(req.body.hod, {
      role: 'hod',
      college: department.college,
      departmentRef: department._id,
      department: department.name,
      'permissions.canApproveMovementPermission': true
    });

    await Event.log({
      eventType: 'department.hod-assigned',
      actor: req.user._id,
      target: req.body.hod,
      resource: { type: 'department', id: department._id },
      details: { department: department.name },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  await Event.log({
    eventType: 'department.updated',
    actor: req.user._id,
    resource: { type: 'department', id: department._id },
    details: req.body,
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    data: department
  });
});
