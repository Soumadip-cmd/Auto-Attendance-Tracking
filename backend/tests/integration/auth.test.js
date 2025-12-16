const request = require('supertest');
const { app } = require('../../src/app');
const { User } = require('../../src/models');

describe('Auth Integration Tests', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'Password@123',
          firstName: 'New',
          lastName: 'User',
          role: 'staff'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data. user.email).toBe('newuser@example.com');
    });

    it('should reject duplicate email', async () => {
      await User.create({
        email: 'existing@example.com',
        password: 'Password@123',
        firstName: 'Existing',
        lastName: 'User'
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'Password@123',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        email: 'testuser@example.com',
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User',
        isActive: true
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password@123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('refreshToken');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'WrongPassword'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token;

    beforeEach(async () => {
      const user = await User.create({
        email: 'metest@example.com',
        password: 'Password@123',
        firstName: 'Me',
        lastName: 'Test',
        isActive: true
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'metest@example.com',
          password: 'Password@123'
        });

      token = loginRes.body.data.token;
    });

    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body. data.email).toBe('metest@example.com');
    });

    it('should reject request without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});