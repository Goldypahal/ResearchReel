const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const jwt = require('jsonwebtoken');

// Mock external systems
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  pool: { on: jest.fn(), end: jest.fn() }
}));

jest.mock('../src/config/redisClient', () => {
  const mockClient = {
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

jest.mock('../src/services/aiService', () => ({
  summarizeDocument: jest.fn().mockResolvedValue({
    abstract: 'Mocked AI Summary',
    key_points: ['point 1', 'point 2'],
    video_script: 'Mocked Video Script'
  })
}));

describe('Integration Flow: Document Upload -> AI Summary -> Feed', () => {
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

  it('should upload a document, generate a summary, and appear in feed', async () => {
    // 1. Upload document (mock the post creation and DB insert)
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 10,
        uploader_id: 1,
        file_name: 'test.pdf',
        file_type: 'pdf',
        file_url: 'http://example.com/uploads/test.pdf'
      }]
    });
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 10,
        uploader_id: 1,
        file_name: 'test.pdf',
        file_type: 'pdf',
        file_url: 'http://example.com/uploads/test.pdf',
        summary_text: 'Mocked AI Summary',
        key_points: ['point 1', 'point 2']
      }]
    });

    const uploadRes = await request(app)
      .post('/api/posts/document/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({
        file_name: 'test.pdf',
        file_type: 'pdf',
        file_url: 'http://example.com/uploads/test.pdf'
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.success).toBe(true);
    expect(uploadRes.body.data.summary_text).toBe('Mocked AI Summary');

    // 2. Fetch Feed
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 10,
        author_id: 1,
        content_type: 'document',
        summary_text: 'Mocked AI Summary',
        username: 'testuser',
        created_at: new Date()
      }]
    });

    const feedRes = await request(app)
      .get('/api/posts/feed')
      .set('Authorization', `Bearer ${token}`);

    expect(feedRes.status).toBe(200);
    expect(feedRes.body.success).toBe(true);
    expect(feedRes.body.data.length).toBeGreaterThan(0);
    expect(feedRes.body.data[0].id).toBe(10);
    expect(feedRes.body.data[0].summary_text).toBe('Mocked AI Summary');
  });
});
