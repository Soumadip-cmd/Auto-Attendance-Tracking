const User = require('../models/User');
const fs = require('fs');
const path = require('path');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, department, isActive, search } = req.query;

    // Build query
    const query = {};

    if (role) query.role = role;
    if (department) query.department = department;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    // Execute query with pagination
    const users = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count:  users.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data:  users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User. findById(req.params.id).select('-password');

    if (!user) {
      return res. status(404).json({
        success: false,
        message:  'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data:  user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user
// @route   POST /api/v1/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      employeeId,
      role,
      department,
      phoneNumber,
      isActive,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { employeeId }] });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Email already exists' 
          : 'Employee ID already exists',
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      employeeId,
      role,
      department,
      phoneNumber,
      isActive,
    });

    // Remove password from response
    user.password = undefined;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/v1/users/: id
// @access  Private/Admin
exports.updateUser = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      employeeId,
      role,
      department,
      phoneNumber,
      isActive,
    } = req.body;

    // Check if user exists
    const user = await User.findById(req. params.id);

    if (!user) {
      return res. status(404).json({
        success: false,
        message:  'User not found',
      });
    }

    // Check if email or employeeId is being changed and already exists
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists',
        });
      }
    }

    if (employeeId && employeeId !== user.employeeId) {
      const empIdExists = await User.findOne({ employeeId });
      if (empIdExists) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists',
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName,
        lastName,
        email,
        employeeId,
        role,
        department,
        phoneNumber,
        isActive,
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete profile picture if exists
    if (user.profilePicture) {
      const imagePath = path.join(__dirname, '../../public', user.profilePicture);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/: id/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phoneNumber } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update only allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;

    await user.save();

    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/v1/users/: id/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    const user = await User.findById(req.params.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Update password
    user.password = newPassword;
    await user. save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload profile picture
// @route   POST /api/v1/users/: id/upload-profile-picture
// @access  Private
exports. uploadProfilePicture = async (req, res, next) => {
  try {
    if (! req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file',
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message:  'User not found',
      });
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldImagePath = path.join(__dirname, '../../public', user.profilePicture);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Update user with new profile picture path
    user. profilePicture = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

// @desc    Delete profile picture
// @route   DELETE /api/v1/users/:id/profile-picture
// @access  Private/Admin
exports.deleteProfilePicture = async (req, res, next) => {
  try {
    const user = await User. findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (! user.profilePicture) {
      return res.status(400).json({
        success: false,
        message: 'User has no profile picture',
      });
    }

    // Delete file from filesystem
    const imagePath = path.join(__dirname, '../../public', user.profilePicture);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    // Remove from database
    user.profilePicture = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};