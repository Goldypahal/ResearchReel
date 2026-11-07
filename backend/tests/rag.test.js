const fs = require('fs');
const http = require('http');
const path = require('path');
const { db, createUser, resetDb, close } = require('./helpers');
const ragIndexer = require('../src/services/rag/ragIndexer');

/**
 * A stand-in for the Python Research RAG service that records what it receives.
 */
const fake = { calls: [], indexed: new Set(), failQuery: false, rejectIngest: false };
let server;

const readBody = (req) => new Promise((resolve) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => resolve(Buffer.concat(chunks)));
});

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

beforeAll(async () => {
  server = http.createServer(async (req, res) => {
    const raw = await readBody(req);
    const call = { method: req.method, url: req.url, apiKey: req.headers['x-api-key'] };
    fake.calls.push(call);
    if (req.method === 'POST' && req.url === '/api/v1/papers') {
      const text = raw.toString('latin1');
      const id = /name="paper_id"\r\n\r\n([^\r]+)/.exec(text)?.[1];
      call.paperId = id;
      call.title = /name="title"\r\n\r\n([^\r]+)/.exec(text)?.[1];
      call.hasPdf = text.includes('%PDF');
      if (fake.rejectIngest) return send(res, 422, { detail: 'No extractable text (the PDF may be scanned images).' });
      fake.indexed.add(id);
      return send(res, 200, { paper_id: id, chunks: 4 });
    }
    if (req.method === 'DELETE' && req.url.startsWith('/api/v1/papers/')) {
      fake.indexed.delete(decodeURIComponent(req.url.split('/').pop()));
      return send(res, 200, { deleted: true });
    }
    if (req.method === 'PATCH') return send(res, 200, JSON.parse(raw.toString()));
    if (req.method === 'POST' && req.url === '/api/v1/query') {
      const body = JSON.parse(raw.toString());
      call.body = body;
      if (fake.failQuery) return send(res, 500, { detail: 'boom' });
      return send(res, 200, {
        answer: 'Both papers study relativity. [1]',
        citations: body.paper_ids.map((id, i) => ({ number: i + 1, paper_id: id, page_start: i + 1, section: '1 Introduction', quote: 'moving bodies' })),
        chunks: []
      });
    }
    if (req.method === 'POST' && req.url.startsWith('/api/v1/intel/')) {
      call.body = JSON.parse(raw.toString());
      return send(res, 200, { result: `## ${req.url.split('/').pop()} report`, paper_ids: call.body.paper_ids });
    }
    return send(res, 404, { detail: 'not found' });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.RAG_SERVICE_URL = `127.0.0.1:${server.address().port}`; // bare host:port, as Render provides
  process.env.RAG_API_KEY = 'shared-secret';
});

afterAll(async () => {
  delete process.env.RAG_SERVICE_URL;
  delete process.env.RAG_API_KEY;
  await new Promise((r) => server.close(r));
  await close();
});

const PDF = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.pdf'));
const upload = (agent, fields = {}) => {
  let req = agent.post('/api/v1/documents').attach('file', PDF, { filename: 'paper.pdf', contentType: 'application/pdf' });
  for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
  return req;
};

let alice; let bob; let carol;
let alicePaper; let bobPublic; let bobPrivate;

beforeAll(async () => {
  await resetDb();
  alice = await createUser('ragalice');
  bob = await createUser('ragbob');
  carol = await createUser('ragcarol');
});

describe('indexing', () => {
  test('an uploaded paper is queued, then indexed under its document id', async () => {
    const r = await upload(alice.agent, { title: 'Relativity Revisited' });
    expect(r.status).toBe(201);
    expect(r.body.data.rag_status).toBe('pending');
    alicePaper = r.body.data.id;

    await ragIndexer.indexDocument(alicePaper);
    const ingest = fake.calls.find((c) => c.paperId === alicePaper);
    expect(ingest).toMatchObject({ apiKey: 'shared-secret', title: 'Relativity Revisited', hasPdf: true });
    const doc = await alice.agent.get(`/api/v1/documents/${alicePaper}`);
    expect(doc.body.data.rag_status).toBe('ready');

    bobPublic = (await upload(bob.agent, { title: 'Bob Public' })).body.data.id;
    bobPrivate = (await upload(bob.agent, { title: 'Bob Private', visibility: 'private' })).body.data.id;
    await ragIndexer.indexDocument(bobPublic);
    await ragIndexer.indexDocument(bobPrivate);
  });

  test('a PDF the service cannot read is marked unsupported and not retried', async () => {
    const id = (await upload(carol.agent, { title: 'Scanned' })).body.data.id;
    fake.rejectIngest = true;
    await expect(ragIndexer.indexDocument(id)).rejects.toThrow('No extractable text');
    fake.rejectIngest = false;
    const r = await db.query('SELECT rag_status, rag_error FROM documents WHERE id = $1', [id]);
    expect(r.rows[0]).toMatchObject({ rag_status: 'unsupported' });
    expect(r.rows[0].rag_error).toMatch(/scanned/);
  });

  test('only the uploader can request re-indexing', async () => {
    expect((await bob.agent.post(`/api/v1/documents/${alicePaper}/reindex`)).status).toBe(403);
    const r = await alice.agent.post(`/api/v1/documents/${alicePaper}/reindex`);
    expect(r.status).toBe(200);
    await ragIndexer.indexDocument(alicePaper);
  });

  test('editing a paper pushes the new title to the index', async () => {
    await alice.agent.put(`/api/v1/documents/${alicePaper}`).send({ title: 'Relativity Revisited (2nd ed.)' });
    await ragIndexer.processJob({ data: { action: 'metadata', documentId: alicePaper }, opts: {}, attemptsMade: 0 });
    expect(fake.calls.some((c) => c.method === 'PATCH' && c.url.endsWith(alicePaper))).toBe(true);
  });

  test('backfill queues papers that were never indexed', async () => {
    await db.query('UPDATE documents SET rag_status = NULL WHERE id = $1', [bobPublic]);
    expect(await ragIndexer.backfill()).toBeGreaterThanOrEqual(1);
    const r = await db.query('SELECT rag_status FROM documents WHERE id = $1', [bobPublic]);
    expect(r.rows[0].rag_status).toBe('pending');
    await ragIndexer.indexDocument(bobPublic);
  });
});

describe('asking across papers', () => {
  let conversationId;

  test('status reports paper search and research tools', async () => {
    const r = await alice.agent.get('/api/v1/ai/status');
    expect(r.body.data).toMatchObject({ configured: true, paper_search: true, general_chat: false });
    expect(r.body.data.research_tools).toContain('compare');
  });

  test('a question over two papers is answered with citations', async () => {
    const r = await alice.agent.post('/api/v1/ai/ask').send({ question: 'What do these papers study?', document_ids: [alicePaper, bobPublic] });
    expect(r.status).toBe(200);
    expect(r.body.data.mode).toBe('rag');
    expect(r.body.data.answer).toContain('[1]');
    const query = fake.calls.filter((c) => c.url === '/api/v1/query').pop();
    expect(query.body.paper_ids.sort()).toEqual([alicePaper, bobPublic].sort());
    const titles = r.body.data.sources.map((s) => s.title);
    expect(titles).toEqual(expect.arrayContaining(['Relativity Revisited (2nd ed.)', 'Bob Public']));
    expect(r.body.data.sources[0]).toMatchObject({ page: 1, section: '1 Introduction' });
    conversationId = r.body.data.conversation_id;
  });

  test('a follow-up keeps the conversation papers', async () => {
    const r = await alice.agent.post('/api/v1/ai/ask').send({ question: 'And their methods?', conversation_id: conversationId });
    expect(r.status).toBe(200);
    const query = fake.calls.filter((c) => c.url === '/api/v1/query').pop();
    expect(query.body.paper_ids.sort()).toEqual([alicePaper, bobPublic].sort());
    const convo = await alice.agent.get(`/api/v1/ai/conversations/${conversationId}`);
    expect(convo.body.data.messages).toHaveLength(4);
    expect(convo.body.data.messages[1].sources.length).toBeGreaterThan(0);
    expect(convo.body.data.papers).toHaveLength(2);
  });

  test("someone else's private paper cannot be searched", async () => {
    const before = fake.calls.length;
    const r = await alice.agent.post('/api/v1/ai/ask').send({ question: 'Leak it', document_ids: [alicePaper, bobPrivate] });
    expect(r.status).toBe(403);
    expect(fake.calls.length).toBe(before);
    const t = await alice.agent.post('/api/v1/ai/research').send({ tool: 'compare', document_ids: [alicePaper, bobPrivate] });
    expect(t.status).toBe(403);
  });

  test('papers still being indexed are reported, not silently skipped', async () => {
    const pending = (await upload(alice.agent, { title: 'Fresh Upload' })).body.data.id;
    const r = await alice.agent.post('/api/v1/ai/ask').send({ question: 'Summarise', document_ids: [alicePaper, pending] });
    expect(r.status).toBe(200);
    expect(r.body.data.notice).toMatch(/Fresh Upload/);
    const only = await alice.agent.post('/api/v1/ai/ask').send({ question: 'Summarise', document_ids: [pending] });
    expect(only.status).toBe(503); // no fallback model configured in tests
  });

  test('if the service fails and no fallback model is configured, the user gets a clear error', async () => {
    fake.failQuery = true;
    const r = await alice.agent.post('/api/v1/ai/ask').send({ question: 'Anything?', document_ids: [alicePaper] });
    fake.failQuery = false;
    expect(r.status).toBe(503);
    expect(r.body.message).toMatch(/temporarily unavailable/);
  });

  test('general questions without papers need the chat model', async () => {
    const r = await alice.agent.post('/api/v1/ai/ask').send({ question: 'Hello' });
    expect(r.status).toBe(400);
  });
});

describe('research tools', () => {
  test('compare needs two papers and returns the report', async () => {
    expect((await alice.agent.post('/api/v1/ai/research').send({ tool: 'compare', document_ids: [alicePaper] })).status).toBe(400);
    expect((await alice.agent.post('/api/v1/ai/research').send({ tool: 'nope', document_ids: [alicePaper] })).status).toBe(400);
    const r = await alice.agent.post('/api/v1/ai/research').send({ tool: 'compare', document_ids: [alicePaper, bobPublic] });
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ tool: 'compare', title: 'Comparison', result: '## compare report' });
    expect(r.body.data.papers).toHaveLength(2);
  });

  test('a literature review works on one paper', async () => {
    const r = await alice.agent.post('/api/v1/ai/research').send({ tool: 'review', document_ids: [alicePaper] });
    expect(r.status).toBe(200);
  });
});

describe('removal', () => {
  test('deleting a paper removes it from the index', async () => {
    expect((await alice.agent.delete(`/api/v1/documents/${alicePaper}`)).status).toBe(200);
    await ragIndexer.processJob({ data: { action: 'remove', documentId: alicePaper }, opts: {}, attemptsMade: 0 });
    expect(fake.indexed.has(alicePaper)).toBe(false);
    // A queued index job for a deleted paper does nothing.
    expect(await ragIndexer.indexDocument(alicePaper)).toEqual({ skipped: 'deleted' });
  });
});

describe('project sharing', () => {
  test('a paper shared to several projects is readable by members of any of them', async () => {
    const { canAccessDocument } = require('../src/authorization/documentAuthorization');
    const p1 = (await bob.agent.post('/api/v1/projects').send({ name: 'One' })).body.data.id;
    const p2 = (await bob.agent.post('/api/v1/projects').send({ name: 'Two' })).body.data.id;
    await db.query('INSERT INTO project_documents (project_id, document_id, added_by) VALUES ($1, $3, $4), ($2, $3, $4)', [p1, p2, bobPrivate, bob.user.id]);
    await bob.agent.post(`/api/v1/projects/${p2}/members`).send({ username: 'ragcarol' });
    expect((await canAccessDocument(carol.user.id, bobPrivate)).allowed).toBe(true);
    expect((await canAccessDocument(alice.user.id, bobPrivate)).allowed).toBe(false);
  });
});
