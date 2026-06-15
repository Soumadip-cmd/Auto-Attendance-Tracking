const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const upload = require('../config/upload');
const { uploadProfilePicture, deleteProfilePicture } = require('../controllers/userController');
const { buildScopedUserFilter, isAdminLike, getUserDepartmentId } = require('../utils/roleUtils');

const MANAGEMENT_ROLES = ['super_admin', 'admin', 'manager', 'hod'];

/**
 * @route   GET /api/v1/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/', protect, authorize(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const query = buildScopedUserFilter(req.user);
    const users = await User.find(query)
      .select('-password')
      .populate('college', 'name code')
      .populate('departmentRef', 'name code')
      .sort('-createdAt');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/stats/overview
 * @desc    Get user statistics
 * @access  Private/Admin/HOD
 */
router.get('/stats/overview', protect, authorize(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const scopedFilter = buildScopedUserFilter(req.user);
    const totalUsers = await User.countDocuments(scopedFilter);
    const activeUsers = await User.countDocuments({ ...scopedFilter, isActive: true });
    const inactiveUsers = await User.countDocuments({ ...scopedFilter, isActive: false });
    
    const usersByRole = await User.aggregate([
      { $match: scopedFilter },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byRole: usersByRole,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/: id
 * @desc    Get single user
 * @access  Private/Admin
 */
router.get('/:id', protect, authorize(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/users
 * @desc    Create user
 * @access  Private/Admin
 */
router.post('/', protect, authorize(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const userData = { ...req.body };

    if (!isAdminLike(req.user)) {
      userData.role = userData.role === 'student' ? 'student' : 'teacher';
      userData.college = req.user.college;
      userData.departmentRef = getUserDepartmentId(req.user);
      userData.department = req.user.department;
      userData.hod = req.user._id;
    }

    const user = await User.create(userData);
    user.password = undefined;
    
    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/v1/users/: id
 * @desc    Update user
 * @access  Private/Admin
 */
router.put('/:id', protect, authorize(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    // Remove password from update if not provided
    const updateData = { ...req.body };
    if (!updateData.password || updateData.password === '') {
      delete updateData.password;
    }
    
    if (!isAdminLike(req.user)) {
      delete updateData.role;
      delete updateData.college;
      delete updateData.departmentRef;
      delete updateData.hod;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: false, // Skip validation for partial updates
    }).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete('/:id', protect, authorize(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Private/Admin
 */
router.get('/legacy-stats/overview', protect, authorize(...MANAGEMENT_ROLES), async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    
    const usersByRole = await User. aggregate([
      {
        $group: {
          _id:  '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        total:  totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        byRole:  usersByRole,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/users/: id/upload-profile-picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/: id/upload-profile-picture', protect, upload.single('profilePicture'), uploadProfilePicture);

/**
 * @route   DELETE /api/v1/users/: id/profile-picture
 * @desc    Delete profile picture
 * @access  Private/Admin
 */
router.delete('/:id/profile-picture', protect, authorize(...MANAGEMENT_ROLES), deleteProfilePicture);

module.exports = router;
