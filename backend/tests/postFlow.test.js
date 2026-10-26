const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const jwt = require('jsonwebtoken');

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
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(true)
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(true)
  }))
}));

// Text extraction runs after the response; it is exercised end-to-end in scripts/e2e-smoke.js.
jest.mock('../src/services/documentProcessor', () => ({
  processDocument: jest.fn().mockResolvedValue(undefined),
  uploadsRoot: require('path').join(require('os').tmpdir(), 'rr-test-uploads')
}));

const db = require('../src/config/db');
const { processDocument } = require('../src/services/documentProcessor');
const app = require('../src/app');

const USER_ID = '11111111-1111-4111-8111-111111111111';
const token = jwt.sign({ id: USER_ID, verification_status: 'verified', typ: 'access' }, process.env.JWT_SECRET || 'testsecret');

describe('Document upload', () => {
  let pdfPath;

  beforeAll(() => {
    pdfPath = path.join(os.tmpdir(), 'rr-test-paper.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4\n% minimal test file\n');
  });

  beforeEach(() => jest.clearAllMocks());

  it('stores the file, registers it as processing, and queues extraction', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{ id: '22222222-2222-4222-8222-222222222222', uploader_id: USER_ID, title: 'My Paper', status: 'processing' }]
    });

    const res = await request(app)
      .post('/api/v1/assets/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'My Paper')
      .attach('file', pdfPath);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('processing');
    const [sql, params] = db.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO documents/);
    expect(params).toContain(USER_ID);

    await new Promise((r) => setImmediate(r));
    expect(processDocument).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222', expect.any(String), 'application/pdf', { useExtractedTitle: false });
  });

  it('rejects file types other than PDF and DOCX', async () => {
    const exe = path.join(os.tmpdir(), 'rr-test.exe');
    fs.writeFileSync(exe, 'MZ');
    const res = await request(app)
      .post('/api/v1/assets/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', exe);
    expect(res.status).toBe(400);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('no longer accepts the legacy URL-registration endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/posts/document/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ file_name: 'x.pdf', file_type: 'pdf', file_url: 'http://example.com/x.pdf' });
    expect(res.status).toBe(404);
  });
});
