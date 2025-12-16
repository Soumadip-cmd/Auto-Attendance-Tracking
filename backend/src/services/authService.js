const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Device, Event } = require('../models');
const logger = require('../config/logger');
const emailService = require('./emailService');

class AuthService {
  /**
   * Generate JWT access token
   */
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env. JWT_SECRET, {
      expiresIn: process.env. JWT_EXPIRES_IN || '15m'
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env. REFRESH_TOKEN_EXPIRES_IN || '7d'
    });
  }

  /**
   * Register a new user
   */
  async register(userData, createdBy = null) {
    const { email, password, firstName, lastName, role, employeeId, department, phoneNumber } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if employeeId already exists
    if (employeeId) {
      const existingEmployee = await User. findOne({ employeeId });
      if (existingEmployee) {
        throw new Error('Employee ID already exists');
      }
    }

    // Create user
    const user = await User. create({
      email,
      password,
      firstName,
      lastName,
      role:  role || 'staff',
      employeeId,
      department,
      phoneNumber,
      createdBy
    });

    // Log event
    await Event.log({
      eventType: 'user. register',
      actor: user._id,
      target: user._id,
      resource: { type: 'user', id: user._id },
      severity: 'info',
      details: { email, role:  user.role }
    });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
    }

    return user;
  }

  /**
   * Authenticate user and generate tokens
   */
  async login(email, password, deviceInfo, ipAddress, userAgent) {
    // Find user and include password
    const user = await User. findOne({ email }).select('+password');
    
    if (!user) {
      await Event.log({
        eventType: 'user.login',
        status: 'failure',
        severity: 'warning',
        details: { email, reason: 'User not found' },
        ipAddress,
        userAgent
      });
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      await Event.log({
        eventType: 'user.login',
        actor: user._id,
        status: 'failure',
        severity: 'warning',
        details: { email, reason: 'Invalid password' },
        ipAddress,
        userAgent
      });
      throw new Error('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Return a temporary token for 2FA verification
      const tempToken = this.generateTempToken(user._id);
      return {
        requiresTwoFactor: true,
        tempToken,
        message: '2FA verification required'
      };
    }

    // Find or create device
    let device = null;
    if (deviceInfo && deviceInfo.deviceId) {
      device = await Device.findOne({ user: user._id, deviceId: deviceInfo.deviceId });
      if (!device) {
        device = await Device.create({
          user: user._id,
          ... deviceInfo
        });
      }
    }

    // Generate tokens
    const token = this.generateToken(user._id);
    const refreshToken = this.generateRefreshToken(user._id);

    // Store refresh token in user document
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    user.refreshTokens.push({
      token: refreshToken,
      device: device?._id,
      expiresAt
    });

    // Keep only last 5 refresh tokens
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    user.lastLogin = new Date();
    await user.save();

    // Log successful login
    await Event.log({
      eventType: 'user.login',
      actor: user._id,
      severity: 'info',
      details: { email },
      device: device?._id,
      ipAddress,
      userAgent
    });

    return {
      user: {
        id: user._id,
        email: user. email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId
      },
      token,
      refreshToken
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

      // Find user and check if refresh token exists
      const user = await User. findById(decoded.id);
      if (!user || !user. isActive) {
        throw new Error('Invalid refresh token');
      }

      // Check if refresh token exists in user's tokens
      const tokenExists = user.refreshTokens.some(
        rt => rt.token === refreshToken && rt.expiresAt > new Date()
      );

      if (!tokenExists) {
        throw new Error('Refresh token not found or expired');
      }

      // Generate new access token
      const newToken = this.generateToken(user._id);

      return {
        token: newToken,
        user: {
          id: user._id,
          email: user. email,
          firstName: user. firstName,
          lastName: user. lastName,
          role: user. role
        }
      };
    } catch (error) {
      logger.error('Refresh token error:', error);
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user and invalidate refresh token
   */
  async logout(userId, refreshToken) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Remove refresh token
    user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
    await user.save();

    // Log logout event
    await Event.log({
      eventType: 'user. logout',
      actor: userId,
      severity: 'info'
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email) {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Store hashed token in user document
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(user, resetToken);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      throw new Error('Error sending email');
    }

    // Log event
    await Event.log({
      eventType: 'user. password-reset',
      actor: user._id,
      severity: 'info',
      details: { email }
    });

    return { message: 'Password reset email sent' };
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(token, newPassword) {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Invalidate all refresh tokens
    user.refreshTokens = [];
    await user.save();

    // Log event
    await Event.log({
      eventType: 'user. password-change',
      actor: user._id,
      severity: 'info',
      details: { method: 'reset' }
    });

    // Send confirmation email
    try {
      await emailService.sendPasswordChangedEmail(user);
    } catch (error) {
      logger.error('Failed to send password changed email:', error);
    }

    return { message: 'Password reset successful' };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCorrect = await user.comparePassword(currentPassword);
    if (!isCorrect) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Invalidate all refresh tokens except current session
    // (This would require tracking current session token)
    
    // Log event
    await Event.log({
      eventType: 'user.password-change',
      actor: userId,
      severity:  'info',
      details:  { method: 'manual' }
    });

    // Send confirmation email
    try {
      await emailService.sendPasswordChangedEmail(user);
    } catch (error) {
      logger.error('Failed to send password changed email:', error);
    }

    return { message: 'Password changed successfully' };
  }

  /**
   * Generate temporary token for 2FA
   */
  generateTempToken(userId) {
    return jwt.sign({ id: userId, temp: true }, process.env.JWT_SECRET, {
      expiresIn: '5m'
    });
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate 2FA secret
    const speakeasy = require('speakeasy');
    const secret = speakeasy.generateSecret({
      name: `AttendanceTracker (${user.email})`
    });

    user.twoFactorSecret = secret.base32;
    user. twoFactorEnabled = false; // Will be enabled after verification
    await user.save();

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url
    };
  }

  /**
   * Verify and enable 2FA
   */
  async verifyAndEnableTwoFactor(userId, token) {
    const speakeasy = require('speakeasy');
    const user = await User.findById(userId);
    
    if (!user || !user.twoFactorSecret) {
      throw new Error('2FA not initialized');
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding:  'base32',
      token
    });

    if (!verified) {
      throw new Error('Invalid verification code');
    }

    user.twoFactorEnabled = true;
    await user.save();

    // Log event
    await Event.log({
      eventType: 'user.2fa-enabled',
      actor: userId,
      severity: 'info'
    });

    return { message: '2FA enabled successfully' };
  }

  /**
   * Verify 2FA token during login
   */
  async verifyTwoFactorLogin(tempToken, twoFactorCode, deviceInfo, ipAddress, userAgent) {
    try {
      const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      
      if (! decoded. temp) {
        throw new Error('Invalid token');
      }

      const user = await User.findById(decoded. id);
      if (!user || !user.twoFactorEnabled) {
        throw new Error('Invalid request');
      }

      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp. verify({
        secret: user. twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!verified) {
        await Event.log({
          eventType: 'user.2fa-failed',
          actor: user._id,
          severity: 'warning',
          details: { reason: 'Invalid code' },
          ipAddress,
          userAgent
        });
        throw new Error('Invalid verification code');
      }

      // Find or create device
      let device = null;
      if (deviceInfo && deviceInfo.deviceId) {
        device = await Device.findOne({ user: user._id, deviceId: deviceInfo.deviceId });
        if (!device) {
          device = await Device.create({
            user: user._id,
            ...deviceInfo
          });
        }
      }

      // Generate tokens
      const token = this. generateToken(user._id);
      const refreshToken = this.generateRefreshToken(user._id);

      // Store refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      user.refreshTokens. push({
        token: refreshToken,
        device: device?._id,
        expiresAt
      });

      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      user.lastLogin = new Date();
      await user.save();

      // Log successful login
      await Event.log({
        eventType: 'user.login',
        actor: user._id,
        severity: 'info',
        details: { email:  user.email, twoFactorUsed: true },
        device: device?._id,
        ipAddress,
        userAgent
      });

      return {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          employeeId: user.employeeId
        },
        token,
        refreshToken
      };
    } catch (error) {
      logger.error('2FA verification error:', error);
      throw new Error('2FA verification failed');
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(userId, password) {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('User not found');
    }

    // Verify password
    const isCorrect = await user.comparePassword(password);
    if (!isCorrect) {
      throw new Error('Invalid password');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    await user.save();

    // Log event
    await Event.log({
      eventType: 'user.2fa-disabled',
      actor: userId,
      severity: 'info'
    });

    return { message: '2FA disabled successfully' };
  }
}

module.exports = new AuthService();