const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'staff'],
    default: 'staff'
  },
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  department: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String
  },
    profilePicture: {
    type: String,
    default: null,
  },
  // Privacy and Consent
  consentGiven: {
    type: Boolean,
    default: false
  },
  consentDate: {
    type: Date
  },
  trackingEnabled: {
    type: Boolean,
    default: false
  },
  privacySettings: {
    shareLocationWithManagers: {
      type: Boolean,
      default: true
    },
    allowHistoryAccess: {
      type: Boolean,
      default: true
    },
    dataRetentionDays: {
      type: Number,
      default: 90
    }
  },
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Refresh Tokens
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device'
    },
    expiresAt: {
      type: Date,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Audit Fields
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes - only non-unique ones (unique already defined in fields)
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ 'refreshTokens.token': 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure token is created after password change
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to add refresh token
userSchema.methods.addRefreshToken = function(token, deviceId, expiresIn) {
  const expiresAt = new Date(Date.now() + expiresIn);
  
  this.refreshTokens.push({
    token,
    device: deviceId,
    expiresAt
  });
  
  // Keep only last 5 tokens per user
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  return this.save();
};

// Method to remove refresh token
userSchema.methods.removeRefreshToken = function(token) {
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== token);
  return this.save();
};

// Method to clean expired refresh tokens
userSchema.methods.cleanExpiredTokens = function() {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > now);
  return this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
