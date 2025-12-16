const jwt = require('jsonwebtoken');
const { User, Device, Event } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * Generate JWT token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
  });
};

/**
 * @desc    Register new user
 * @route   POST /api/v1/auth/register
 * @access  Public (or Admin only for bulk registration)
 */
exports.register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role, employeeId, department, phoneNumber } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'User with this email already exists'
    });
  }

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    role: role || 'staff',
    employeeId,
    department,
    phoneNumber,
    createdBy: req.user?._id
  });

  // Log event
  await Event.log({
    eventType: 'user.register',
    actor: user._id,
    target: user._id,
    resource: { type: 'user', id: user._id },
    severity: 'info',
    details: { email, role: user.role },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token,
      refreshToken
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    await Event.log({
      eventType: 'user.login',
      status: 'failure',
      severity: 'warning',
      details: { email, reason: 'User not found' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Check if user is active
  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account is deactivated'
    });
  }

  // Check password
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    await Event.log({
      eventType: 'user.login',
      actor: user._id,
      status: 'failure',
      severity: 'warning',
      details: { email, reason: 'Invalid password' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  // Generate tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store refresh token
  const refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days
  await user.addRefreshToken(refreshToken, null, refreshTokenExpiry);

  // Log successful login
  await Event.log({
    eventType: 'user.login',
    actor: user._id,
    status: 'success',
    severity: 'info',
    details: { email },
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        consentGiven: user.consentGiven,
        trackingEnabled: user.trackingEnabled
      },
      token,
      refreshToken
    }
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/v1/auth/refresh
 * @access  Public
 */
exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      message: 'Refresh token is required'
    });
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Get user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if refresh token exists in user's tokens
    const tokenExists = user.refreshTokens.some(
      rt => rt.token === refreshToken && rt.expiresAt > new Date()
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    // Generate new access token
    const newToken = generateToken(user._id);

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await req.user.removeRefreshToken(refreshToken);
  }

  // Log logout
  await Event.log({
    eventType: 'user.logout',
    actor: req.user._id,
    severity: 'info',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @desc    Get current user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('assignedGeofences', 'name type');

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * @desc    Update user consent and privacy settings
 * @route   PUT /api/v1/auth/privacy
 * @access  Private
 */
exports.updatePrivacy = asyncHandler(async (req, res) => {
  const { consentGiven, trackingEnabled, privacySettings } = req.body;

  const updateData = {};

  if (typeof consentGiven !== 'undefined') {
    updateData.consentGiven = consentGiven;
    if (consentGiven) {
      updateData.consentDate = Date.now();
      
      await Event.log({
        eventType: 'privacy.consent-given',
        actor: req.user._id,
        severity: 'info',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    } else {
      await Event.log({
        eventType: 'privacy.consent-revoked',
        actor: req.user._id,
        severity: 'warning',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
    }
  }

  if (typeof trackingEnabled !== 'undefined') {
    updateData.trackingEnabled = trackingEnabled;
    
    await Event.log({
      eventType: trackingEnabled ? 'privacy.tracking-enabled' : 'privacy.tracking-disabled',
      actor: req.user._id,
      severity: 'info',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  }

  if (privacySettings) {
    updateData.privacySettings = { ...req.user.privacySettings, ...privacySettings };
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: { user }
  });
});

/**
 * @desc    Change password
 * @route   PUT /api/v1/auth/password
 * @access  Private
 */
exports.updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isPasswordCorrect = await user.comparePassword(currentPassword);
  if (!isPasswordCorrect) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect'
    });
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Clear all refresh tokens
  user.refreshTokens = [];
  await user.save();

  // Log password change
  await Event.log({
    eventType: 'user.password-change',
    actor: user._id,
    severity: 'warning',
    ipAddress: req.ip,
    userAgent: req.get('user-agent')
  });

  // Generate new tokens
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.json({
    success: true,
    message: 'Password updated successfully',
    data: {
      token,
      refreshToken
    }
  });
});
