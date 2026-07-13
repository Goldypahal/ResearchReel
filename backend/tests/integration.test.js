const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock downstream databases and queues before requiring app.js
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

jest.mock('../src/services/searchService', () => ({
  indexEntity: jest.fn().mockResolvedValue(true),
  removeEntity: jest.fn().mockResolvedValue(true),
  searchDocuments: jest.fn().mockResolvedValue({
    results: [{ id: 1, title: 'Quantum Computing Post' }],
    nextCursor: null
  })
}));

jest.mock('../src/services/ai/ragService', () => ({
  query: jest.fn().mockResolvedValue({
    answer: 'This is a mock RAG answer',
    chunks: [{ content: 'Context chunk...', metadata: { page: 1, section: 'Abstract' } }],
    latency: 120
  })
}));

const db = require('../src/config/db');
const redisClient = require('../src/config/redisClient');
const app = require('../src/app');

let server;

beforeAll(async () => {
  server = app.listen(5002);
});

afterAll(async () => {
  server.close();
});

describe('Integration Tests: Core Features', () => {
  let token;

  beforeAll(() => {
    token = jwt.sign(
      { id: 1, verification_status: 'verified' },
      process.env.JWT_SECRET || 'testsecret'
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should pass health check when downstream services are healthy', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
    redisClient.client.ping.mockResolvedValueOnce('PONG');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ status: 'UP' })
    });

    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  it('should block unauthenticated access to post creation', async () => {
    const res = await request(app)
      .post('/api/posts/create')
      .send({ content_type: 'text', caption: 'Test' });
    expect(res.statusCode).toBe(401);
  });

  it('should block unauthenticated access to reel upload', async () => {
    const res = await request(app)
      .post('/api/reels/generate-draft')
      .send({ title: 'Test Reel' });
    expect(res.statusCode).toBe(401);
  });

  it('should block unauthenticated access to ask gemini', async () => {
    const res = await request(app)
      .post('/api/ai/ask-gemini')
      .send({ question: 'What is quantum?' });
    expect(res.statusCode).toBe(401);
  });

  it('should successfully answer RAG queries', async () => {
    const res = await request(app)
      .post('/api/ai/ask-gemini')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'What is quantum?' });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.answer).toBe('This is a mock RAG answer');
  });

  it('should successfully react to a post', async () => {
    db.query.mockResolvedValueOnce({ rows: [] }); // Update reaction query

    const res = await request(app)
      .post('/api/posts/react')
      .set('Authorization', `Bearer ${token}`)
      .send({ post_id: 123, reaction_type: 'like' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Reaction updated');
  });

  it('should search for documents/posts', async () => {
    const res = await request(app)
      .get('/api/search/documents')
      .set('Authorization', `Bearer ${token}`)
      .query({ q: 'quantum', type: 'posts' });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data[0].title).toBe('Quantum Computing Post');
  });

  it('should send and retrieve messages', async () => {
    // 1. Mock sending a message
    db.query.mockResolvedValueOnce({
      rows: [{ id: 1, sender_id: 1, receiver_id: 2, content: 'Hello researcher' }]
    });

    const sendRes = await request(app)
      .post('/api/messages/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ receiver_id: 2, content: 'Hello researcher', conversation_id: 'conv_123', sender_id: 1 });

    expect(sendRes.statusCode).toBe(201);
    expect(sendRes.body.success).toBe(true);
    expect(sendRes.body.data.content).toBe('Hello researcher');

    // 2. Mock retrieving conversations
    db.query.mockResolvedValueOnce({
      rows: [{ id: 'conv_123', last_message: 'Hello researcher' }]
    });

    const convRes = await request(app)
      .get('/api/messages/conversations')
      .set('Authorization', `Bearer ${token}`)
      .query({ user_id: 1 });

    expect(convRes.statusCode).toBe(200);
    expect(convRes.body.success).toBe(true);
    expect(convRes.body.data).toBeDefined();
  });

  it('should block posts containing banned keywords (content moderation)', async () => {
    const res = await request(app)
      .post('/api/posts/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ content_type: 'text', caption: 'Buy bitcoin now!' });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('violates our community guidelines');
  });
});
