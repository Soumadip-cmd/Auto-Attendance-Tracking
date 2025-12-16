const authService = require('../../../src/services/authService');
const { User } = require('../../../src/models');
const jwt = require('jsonwebtoken');

describe('AuthService', () => {
  describe('register', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User',
        role: 'staff'
      };

      const user = await authService.register(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.role).toBe('staff');
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User'
      };

      await authService.register(userData);

      await expect(authService.register(userData))
        .rejects
        . toThrow('User with this email already exists');
    });

    it('should hash password before saving', async () => {
      const userData = {
        email: 'hash@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User'
      };

      const user = await authService.register(userData);
      const savedUser = await User.findById(user._id).select('+password');

      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password. length).toBeGreaterThan(20);
    });
  });

  describe('login', () => {
    beforeEach(async () => {
      await authService.register({
        email: 'login@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User'
      });
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login(
        'login@example.com',
        'Password@123',
        { deviceId: 'test-device', deviceType: 'android' },
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('login@example.com');
    });

    it('should reject invalid password', async () => {
      await expect(
        authService.login(
          'login@example.com',
          'WrongPassword',
          {},
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      await expect(
        authService.login(
          'nonexistent@example.com',
          'Password@123',
          {},
          '127.0.0.1',
          'test-agent'
        )
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const userId = 'test-user-id';
      const token = authService.generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded. id).toBe(userId);
    });
  });

  describe('refreshAccessToken', () => {
    it('should generate new access token with valid refresh token', async () => {
      const user = await authService.register({
        email: 'refresh@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User'
      });

      const refreshToken = authService.generateRefreshToken(user._id);
      
      await User.findByIdAndUpdate(user._id, {
        $push: {
          refreshTokens: {
            token: refreshToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        }
      });

      const result = await authService.refreshAccessToken(refreshToken);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
    });
  });
});