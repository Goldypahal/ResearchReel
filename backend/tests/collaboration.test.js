const fs = require('fs');
const path = require('path');
const { app, request, createUser, resetDb, close } = require('./helpers');

let alice; let bob; let eve;
beforeAll(async () => {
  await resetDb();
  alice = await createUser('alice');
  bob = await createUser('bob');
  eve = await createUser('eve');
});
afterAll(close);

const PDF = fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.pdf'));

describe('messages', () => {
  let cid;
  test('start conversation, send, unread, read', async () => {
    const c = await alice.agent.post('/api/v1/messages/conversations').send({ username: 'bob' });
    expect(c.status).toBe(200);
    cid = c.body.data.id;
    const again = await alice.agent.post('/api/v1/messages/conversations').send({ username: 'bob' });
    expect(again.body.data.id).toBe(cid);

    expect((await alice.agent.post('/api/v1/messages/send').send({ conversation_id: cid, content: 'hi bob' })).status).toBe(201);
    expect((await bob.agent.get('/api/v1/messages/unread-count')).body.data.count).toBe(1);
    const list = await bob.agent.get('/api/v1/messages/conversations');
    expect(list.body.data[0]).toMatchObject({ last_message: 'hi bob', unread_count: 1 });
    expect(list.body.data[0].participants[0].username).toBe('alice');
    await bob.agent.post('/api/v1/messages/read').send({ conversation_id: cid });
    expect((await bob.agent.get('/api/v1/messages/unread-count')).body.data.count).toBe(0);
  });

  test('outsiders cannot read or post into a conversation', async () => {
    expect((await eve.agent.get(`/api/v1/messages/${cid}/messages`)).status).toBe(404);
    expect((await eve.agent.post('/api/v1/messages/send').send({ conversation_id: cid, content: 'intrude' })).status).toBe(404);
  });
});

describe('documents', () => {
  let publicId; let privateId;
  test('upload extracts text and metadata; rejects non-PDF content', async () => {
    const r = await alice.agent.post('/api/v1/documents').attach('file', PDF, { filename: 'paper.pdf', contentType: 'application/pdf' }).field('tags', 'physics');
    expect(r.status).toBe(201);
    expect(r.body.data.page_count).toBeGreaterThan(0);
    expect(r.body.data.tags).toEqual(['physics']);
    publicId = r.body.data.id;
    const p = await alice.agent.post('/api/v1/documents').attach('file', PDF, { filename: 'secret.pdf', contentType: 'application/pdf' }).field('visibility', 'private');
    privateId = p.body.data.id;
    const bad = await alice.agent.post('/api/v1/documents').attach('file', Buffer.from('hello'), { filename: 'x.pdf', contentType: 'application/pdf' });
    expect(bad.status).toBe(400);
  });

  test('private papers are hidden from others', async () => {
    expect((await bob.agent.get(`/api/v1/documents/${privateId}`)).status).toBe(404);
    expect((await alice.agent.get(`/api/v1/documents/${privateId}`)).status).toBe(200);
    const pub = await request(app).get('/api/v1/documents');
    expect(pub.body.data.documents.map((d) => d.id)).toEqual([publicId]);
    expect((await bob.agent.delete(`/api/v1/documents/${publicId}`)).status).toBe(404);
  });

  test('reel draft from a paper uses its text (no AI key configured)', async () => {
    const r = await alice.agent.post('/api/v1/reels/generate-draft').send({ document_id: publicId });
    expect(r.status).toBe(201);
    expect(r.body.data.scenes.length).toBeGreaterThan(1);
    expect((await bob.agent.post('/api/v1/reels/generate-draft').send({ document_id: publicId })).status).toBe(404);
    const upd = await alice.agent.put(`/api/v1/reels/draft/${r.body.data.id}`).send({ scenes: [{ title: 'Hi', dialogue: "it's $(rm -rf /) `x`", duration: 4 }] });
    expect(upd.status).toBe(200);
    expect((await bob.agent.get(`/api/v1/reels/draft/${r.body.data.id}`)).status).toBe(404);
  });

  test('AI endpoints report unavailability honestly without a key', async () => {
    const r = await alice.agent.post('/api/v1/ai/ask').send({ question: 'What is this paper about?', document_id: publicId });
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('AI_UNAVAILABLE');
  });
});

describe('projects', () => {
  let pid; let taskId;
  test('owner creates, adds members, assigns tasks', async () => {
    const p = await alice.agent.post('/api/v1/projects').send({ name: 'Quantum study' });
    expect(p.status).toBe(201);
    pid = p.body.data.id;
    expect((await alice.agent.post(`/api/v1/projects/${pid}/members`).send({ username: 'bob' })).status).toBe(201);
    expect((await alice.agent.post(`/api/v1/projects/${pid}/tasks`).send({ title: 'x', assigned_to: 'eve' })).status).toBe(400);
    const t = await alice.agent.post(`/api/v1/projects/${pid}/tasks`).send({ title: 'Lit review', assigned_to: 'bob', priority: 'high' });
    expect(t.status).toBe(201);
    taskId = t.body.data.id;
    expect(t.body.data.assignee_username).toBe('bob');
  });

  test('members can update tasks; outsiders cannot see or modify anything', async () => {
    expect((await bob.agent.put(`/api/v1/projects/tasks/${taskId}`).send({ status: 'done' })).body.data.status).toBe('done');
    expect((await bob.agent.put(`/api/v1/projects/tasks/${taskId}`).send({ status: 'bogus' })).status).toBe(400);
    expect((await eve.agent.get(`/api/v1/projects/${pid}`)).status).toBe(404);
    expect((await eve.agent.get(`/api/v1/projects/${pid}/tasks`)).status).toBe(404);
    expect((await eve.agent.put(`/api/v1/projects/tasks/${taskId}`).send({ status: 'todo' })).status).toBe(404);
    expect((await bob.agent.delete(`/api/v1/projects/${pid}`)).status).toBe(403);
    expect((await bob.agent.post(`/api/v1/projects/${pid}/members`).send({ username: 'eve' })).status).toBe(403);
    const mine = await bob.agent.get('/api/v1/projects/tasks/mine');
    expect(mine.body.data[0].project_name).toBe('Quantum study');
  });
});

describe('lectures and conferences', () => {
  test('meeting links are only shown to attendees', async () => {
    const l = await alice.agent.post('/api/v1/lectures').send({ title: 'Intro to QFT', meeting_url: 'https://meet.example.com/x' });
    expect(l.status).toBe(201);
    const id = l.body.data.id;
    expect((await bob.agent.get(`/api/v1/lectures/${id}`)).body.data.meeting_url).toBeNull();
    await bob.agent.post(`/api/v1/lectures/${id}/attend`);
    expect((await bob.agent.get(`/api/v1/lectures/${id}`)).body.data.meeting_url).toBe('https://meet.example.com/x');
    expect((await bob.agent.post(`/api/v1/lectures/${id}/status`).send({ action: 'start' })).status).toBe(404);
    expect((await alice.agent.post(`/api/v1/lectures/${id}/status`).send({ action: 'start' })).body.data.status).toBe('live');
    expect((await alice.agent.post('/api/v1/lectures').send({ title: 'x', meeting_url: 'javascript:alert(1)' })).status).toBe(400);
  });

  test('conference dates round-trip exactly', async () => {
    const c = await alice.agent.post('/api/v1/conferences').send({ name: 'NeurIPS 2027', start_date: '2027-12-01', submission_deadline: '2027-05-15' });
    expect(c.body.data.start_date).toBe('2027-12-01');
    expect(c.body.data.submission_deadline).toBe('2027-05-15');
    expect((await bob.agent.delete(`/api/v1/conferences/${c.body.data.id}`)).status).toBe(404);
  });
});

describe('moderation', () => {
  test('only staff can review; removing content resolves reports', async () => {
    const post = await alice.agent.post('/api/v1/posts').send({ caption: 'questionable' });
    expect((await bob.agent.post('/api/v1/moderation/report').send({ post_id: post.body.data.id, reason: 'spam' })).status).toBe(201);
    expect((await bob.agent.get('/api/v1/moderation/reports')).status).toBe(403);

    const mod = await createUser('mod1', { role: 'moderator' });
    const reports = await mod.agent.get('/api/v1/moderation/reports');
    expect(reports.status).toBe(200);
    const rid = reports.body.data[0].id;
    expect((await mod.agent.post(`/api/v1/moderation/reports/${rid}/resolve`).send({ action: 'remove' })).status).toBe(200);
    expect((await request(app).get(`/api/v1/posts/${post.body.data.id}`)).status).toBe(404);
    // Moderators cannot grant roles.
    expect((await mod.agent.post(`/api/v1/moderation/users/${bob.user.id}/verify`).send({ role: 'admin' })).status).toBe(403);
  });
});

describe('health', () => {
  test('reports database and redis', async () => {
    const r = await request(app).get('/api/v1/health');
    expect(r.status).toBe(200);
    expect(r.body.services.database.status).toBe('UP');
    expect(r.body.services.redis.status).toBe('UP');
  });
});

describe('upload tokens', () => {
  test('only work on upload endpoints', async () => {
    const tok = (await alice.agent.get('/api/v1/auth/upload-token')).body.data.token;
    const r = await request(app).post('/api/v1/posts').set('Authorization', `Bearer ${tok}`).send({ caption: 'via upload token' });
    expect(r.status).toBe(201);
    expect((await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${tok}`)).status).toBe(401);
    expect((await request(app).delete(`/api/v1/posts/${r.body.data.id}`).set('Authorization', `Bearer ${tok}`)).status).toBe(401);
  });
});
