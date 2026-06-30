const request = require('supertest');
const app = require('../src/app');
const { Pool } = require('pg');

let server;

beforeAll(async () => {
  server = app.listen(5001);
});

afterAll(async () => {
  server.close();
});

describe('Integration Tests: Core Features', () => {
  it('should pass health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should block unauthenticated access to post creation', async () => {
    const res = await request(app)
      .post('/api/posts')
      .send({ content_type: 'text', caption: 'Test' });
    expect(res.statusCode).toBe(401);
  });

  it('should block unauthenticated access to reel upload', async () => {
    const res = await request(app)
      .post('/api/reels/upload')
      .send({ title: 'Test Reel' });
    expect(res.statusCode).toBe(401);
  });

  it('should reject invalid RAG queries', async () => {
    const res = await request(app)
      .post('/api/ai/rag/query')
      .send({ query: '' }); // Invalid empty query
    expect(res.statusCode).toBe(400); // Or 401 depending on middleware
  });
});
