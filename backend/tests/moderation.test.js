const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock downstream databases and queues
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  pool: {
    on: jest.fn(),
    end: jest.fn()
  }
}));

jest.mock('../src/config/redisClient', () => {
  const mockClient = {
    ping: jest.fn().mockResolvedValue('PONG'),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(true),
    duplicate: jest.fn().mockImplementation(() => mockClient),
    publish: jest.fn().mockResolvedValue(true),
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

const db = require('../src/config/db');
const app = require('../src/app');

let server;

beforeAll(async () => {
  server = app.listen(5003);
});

afterAll(async () => {
  server.close();
});

describe('Integration Tests: Content Moderation & Reporting', () => {
  let userToken;
  let adminToken;

  beforeAll(() => {
    userToken = jwt.sign(
      { id: 'user-id-123', verification_status: 'verified', role: 'user' },
      process.env.JWT_SECRET || 'testsecret'
    );
    adminToken = jwt.sign(
      { id: 'admin-id-123', verification_status: 'verified', role: 'admin' },
      process.env.JWT_SECRET || 'testsecret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit a report for a post successfully', async () => {
    // Mock check post exists
    db.query.mockResolvedValueOnce({ rows: [{ id: 'post-id-123' }] });
    // Mock insert report
    db.query.mockResolvedValueOnce({ rows: [{ id: 'report-id-123', reason: 'inappropriate', status: 'pending' }] });

    const res = await request(app)
      .post('/api/moderation/report')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ post_id: 'post-id-123', reason: 'inappropriate', details: 'Contains offensive text' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reason).toBe('inappropriate');
    expect(res.body.data.status).toBe('pending');
  });

  it('should prevent guest user from submitting a report', async () => {
    const res = await request(app)
      .post('/api/moderation/report')
      .send({ post_id: 'post-id-123', reason: 'inappropriate' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should prevent non-admin from listing reports', async () => {
    const res = await request(app)
      .get('/api/moderation/reports')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow admin to list reports', async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        { id: 'report-id-123', post_id: 'post-id-123', reason: 'spam', status: 'pending' }
      ]
    });

    const res = await request(app)
      .get('/api/moderation/reports')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].reason).toBe('spam');
  });

  it('should allow admin to resolve a report by deleting the post', async () => {
    // 1. Report exists check
    db.query.mockResolvedValueOnce({ rows: [{ id: 'report-id-123', post_id: 'post-id-123' }] });
    // 2. Delete post query mock
    db.query.mockResolvedValueOnce({ rows: [] });
    // 3. Update report status query mock
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/moderation/reports/report-id-123/resolve')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'delete_post' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('delete_post');
  });

  it('should allow admin to verify a user and promote role', async () => {
    // 1. User check
    db.query.mockResolvedValueOnce({ rows: [{ id: 'user-id-456' }] });
    // 2. Update user query mock
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'user-id-456', username: 'student_user', verification_status: 'verified', role: 'moderator' }]
    });

    const res = await request(app)
      .post('/api/moderation/users/user-id-456/verify')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'verified', role: 'moderator' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.verification_status).toBe('verified');
    expect(res.body.data.role).toBe('moderator');
  });
});
