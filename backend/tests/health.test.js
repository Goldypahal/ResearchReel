const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const redisClient = require('../src/config/redisClient');

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

jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  pool: {
    on: jest.fn(),
    end: jest.fn()
  }
}));

jest.mock('../src/config/redisClient', () => {
  const mockClient = {
    ping: jest.fn(),
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(true)
  };
  return {
    client: mockClient,
    createDuplicate: jest.fn().mockImplementation(() => mockClient),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };
});

describe('Health Check API Endpoint', () => {
  let originalFetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.RAG_SERVICE_URL;
  });

  it('should return 200 and UP status when all downstream services are healthy', async () => {
    process.env.RAG_SERVICE_URL = 'http://rag-service:8000/api/v1';
    db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
    redisClient.client.ping.mockResolvedValueOnce('PONG');

    // Mock native fetch for RAG and Elasticsearch
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === 'http://rag-service:8000/api/ai/health') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: 'UP', service: 'ai-rag-service' })
        });
      }
      if (url.includes('9200') || url.includes('elasticsearch')) {
        return Promise.resolve({
          ok: true,
          status: 200
        });
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('UP');
    expect(response.body.services.database.status).toBe('UP');
    expect(response.body.services.redis.status).toBe('UP');
    expect(response.body.services.rag_service.status).toBe('UP');
    expect(response.body.services.elasticsearch.status).toBe('UP');
    expect(response.body.services.uptime_seconds).toBeDefined();
    expect(response.body.services.system).toBeUndefined();
  });

  it('should return 200 and DEGRADED when only an optional service is down', async () => {
    process.env.RAG_SERVICE_URL = 'http://rag-service:8000/api/v1';
    db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
    redisClient.client.ping.mockResolvedValueOnce('PONG');
    global.fetch = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED'));

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('DEGRADED');
    expect(response.body.services.rag_service.status).toBe('DOWN');
  });

  it('should return 503 and DOWN status when the database is down', async () => {
    db.query.mockRejectedValueOnce(new Error('PostgreSql Connection Timeout'));
    redisClient.client.ping.mockResolvedValueOnce('PONG');

    global.fetch = jest.fn().mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ status: 'UP' })
      });
    });

    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('DOWN');
    expect(response.body.services.database.status).toBe('DOWN');
    expect(response.body.services.database.error).toBe('PostgreSql Connection Timeout');
    expect(response.body.services.redis.status).toBe('UP');
  });
});
