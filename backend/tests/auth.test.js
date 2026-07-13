const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const redisClient = require('../src/config/redisClient');
const { sendOTP } = require('../src/utils/emailService');
const searchService = require('../src/services/searchService');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

// Mock external systems
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  pool: {
    on: jest.fn(),
    end: jest.fn()
  }
}));

jest.mock('../src/config/redisClient', () => {
  const mockClient = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    duplicate: jest.fn().mockImplementation(() => mockClient),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };
  return {
    client: mockClient,
    createDuplicate: jest.fn().mockImplementation(() => mockClient),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };
});

jest.mock('../src/utils/emailService', () => ({
  sendOTP: jest.fn().mockResolvedValue(true)
}));

jest.mock('../src/services/searchService', () => ({
  indexEntity: jest.fn().mockResolvedValue(true),
  removeEntity: jest.fn().mockResolvedValue(true),
  searchDocuments: jest.fn().mockResolvedValue([])
}));

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(true)
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(true)
  }))
}));

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('mocked_password_hash'),
  verify: jest.fn().mockImplementation((hash, plain) => Promise.resolve(plain === 'correct_password'))
}));

describe('Backend Smoke Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET / (Health Check)', () => {
    it('should return 200 Welcome status', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Welcome to ResearchReel API Gateway',
        status: 'Running'
      });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should fail registration if fields are missing or invalid', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: '123' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should successfully register a new user', async () => {
      // Mock db query to return no existing user first
      db.query.mockResolvedValueOnce({ rows: [] });
      // Mock db query for inserting user
      db.query.mockResolvedValueOnce({
        rows: [{ id: 1, email: 'test@example.com', username: 'testuser', verification_status: 'unverified' }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'securepassword123',
          full_name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.email).toBe('test@example.com');
      expect(db.query).toHaveBeenCalledTimes(2);
      expect(redisClient.set).toHaveBeenCalled();
      expect(sendOTP).toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should fail login with invalid fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid-email' });
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail login if user does not exist', async () => {
      db.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correct_password' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should successfully login user and set HttpOnly cookies', async () => {
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'test@example.com',
          username: 'testuser',
          password_hash: 'mocked_password_hash',
          verification_status: 'verified'
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correct_password' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('testuser');

      // Check cookies
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some(c => c.includes('accessToken'))).toBe(true);
      expect(cookies.some(c => c.includes('refreshToken'))).toBe(true);
    });
  });

  describe('Full Authentication Flow: Register -> OTP Verify -> Login', () => {
    it('should successfully complete the entire auth lifecycle', async () => {
      // 1. Register
      db.query.mockResolvedValueOnce({ rows: [] }); // No existing user
      db.query.mockResolvedValueOnce({
        rows: [{ id: 2, email: 'flow@example.com', username: 'flowuser', verification_status: 'unverified' }]
      });

      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'flow@example.com',
          username: 'flowuser',
          password: 'flowpassword123',
          full_name: 'Flow User'
        });

      expect(registerRes.status).toBe(201);
      expect(registerRes.body.success).toBe(true);

      // 2. OTP Verify
      redisClient.get.mockResolvedValueOnce(JSON.stringify({ otp: '123456' })); // Mock stored OTP
      db.query.mockResolvedValueOnce({ rows: [] }); // Update user status
      db.query.mockResolvedValueOnce({
        rows: [{ id: 2, email: 'flow@example.com', username: 'flowuser', verification_status: 'verified' }]
      }); // Select user after verification
      
      const verifyRes = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'flow@example.com',
          otp: '123456'
        });
        
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // 3. Login
      db.query.mockResolvedValueOnce({
        rows: [{
          id: 2,
          email: 'flow@example.com',
          username: 'flowuser',
          password_hash: 'mocked_password_hash',
          verification_status: 'verified'
        }]
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'flow@example.com', password: 'correct_password' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
      expect(loginRes.headers['set-cookie']).toBeDefined();
    });
  });

  describe('Authentication Middleware', () => {
    it('should deny access to private routes if no token is provided', async () => {
      const response = await request(app)
        .post('/api/auth/verify/student')
        .send({ user_id: 1, university: 'MIT' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No authentication token');
    });

    it('should deny access to private routes if an invalid token is provided', async () => {
      const response = await request(app)
        .post('/api/auth/verify/student')
        .set('Authorization', 'Bearer invalidtoken')
        .send({ user_id: 1, university: 'MIT' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should allow access to private routes if a valid token is provided', async () => {
      // Mock db query inside studentVerification
      db.query.mockResolvedValueOnce({ rows: [] });

      // Generate a mock JWT token
      const token = jwt.sign(
        { id: 1, verification_status: 'verified' },
        process.env.JWT_SECRET || 'testsecret'
      );

      const response = await request(app)
        .post('/api/auth/verify/student')
        .set('Authorization', `Bearer ${token}`)
        .send({ user_id: 1, university: 'MIT' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Student ID Submitted');
    });
  });
});
