const { request, app, db, connect, close, signedInUser } = require('./helpers');

beforeAll(connect);
afterAll(close);

const inHours = (h) => new Date(Date.now() + h * 3600 * 1000).toISOString();

const lectureInput = (over = {}) => ({
  title: 'Integration tests for quantum networks',
  description: 'How we test entanglement distribution end to end.',
  topic: 'Physics',
  tags: 'quantum, testing',
  starts_at: inHours(48),
  duration_minutes: 60,
  capacity: null,
  join_url: 'https://meet.example.org/abc',
  ...over,
});

describe('lectures (real Postgres)', () => {
  let host;
  let student;

  beforeAll(async () => {
    host = await signedInUser({ verification: 'scholar', name: 'Host Scholar' });
    student = await signedInUser({ verification: 'student' });
  });

  it('only lets verified scholars and faculty host', async () => {
    const res = await student.agent.post('/api/v1/lectures').send(lectureInput());
    expect(res.status).toBe(403);
    expect((await student.agent.get('/api/v1/lectures/can-host')).body.data.can_host).toBe(false);
    expect((await host.agent.get('/api/v1/lectures/can-host')).body.data.can_host).toBe(true);
  });

  it('validates input', async () => {
    const past = await host.agent.post('/api/v1/lectures').send(lectureInput({ starts_at: inHours(-1) }));
    expect(past.status).toBe(400);
    const badLink = await host.agent.post('/api/v1/lectures').send(lectureInput({ join_url: 'javascript:alert(1)' }));
    expect(badLink.status).toBe(400);
  });

  it('hides the join link until you register, and shows it after', async () => {
    const created = await host.agent.post('/api/v1/lectures').send(lectureInput());
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    expect(created.body.data.tags).toEqual(['quantum', 'testing']);
    expect(created.body.data.join_url).toBe('https://meet.example.org/abc');

    const anon = await request(app).get(`/api/v1/lectures/${id}`);
    expect(anon.body.data.join_url).toBeNull();
    expect(anon.body.data.has_join_url).toBe(true);

    const before = await student.agent.get(`/api/v1/lectures/${id}`);
    expect(before.body.data.join_url).toBeNull();
    const reg = await student.agent.post(`/api/v1/lectures/${id}/register`);
    expect(reg.status).toBe(200);
    expect(reg.body.data.join_url).toBe('https://meet.example.org/abc');
  });

  it('never overfills a lecture under concurrent registrations', async () => {
    const created = await host.agent.post('/api/v1/lectures').send(lectureInput({ capacity: 3 }));
    const id = created.body.data.id;
    const people = await Promise.all(Array.from({ length: 8 }, () => signedInUser()));
    const results = await Promise.all(people.map((p) => p.agent.post(`/api/v1/lectures/${id}/register`)));
    const ok = results.filter((r) => r.status === 200).length;
    const full = results.filter((r) => r.status === 409 && r.body.error.code === 'LECTURE_FULL').length;
    expect(ok).toBe(3);
    expect(full).toBe(5);
    const count = await db.query('SELECT COUNT(*)::int AS n FROM lecture_registrations WHERE lecture_id = $1', [id]);
    expect(count.rows[0].n).toBe(3);
  });

  it('moderated Q&A: registration required, host moderates, hidden questions stay hidden', async () => {
    const id = (await host.agent.post('/api/v1/lectures').send(lectureInput())).body.data.id;
    const outsider = await signedInUser();
    expect((await outsider.agent.post(`/api/v1/lectures/${id}/questions`).send({ body: 'Hi?' })).status).toBe(403);

    await student.agent.post(`/api/v1/lectures/${id}/register`);
    const asked = await student.agent.post(`/api/v1/lectures/${id}/questions`).send({ body: 'How do you verify the Bell violation?' });
    expect(asked.status).toBe(201);
    const qid = asked.body.data.id;

    expect((await student.agent.patch(`/api/v1/lectures/${id}/questions/${qid}`).send({ is_hidden: true })).status).toBe(403);
    expect((await host.agent.patch(`/api/v1/lectures/${id}/questions/${qid}`).send({ is_hidden: true })).status).toBe(200);

    expect((await request(app).get(`/api/v1/lectures/${id}/questions`)).body.data).toHaveLength(0);
    expect((await student.agent.get(`/api/v1/lectures/${id}/questions`)).body.data).toHaveLength(1);
    expect((await host.agent.get(`/api/v1/lectures/${id}/questions`)).body.data[0].is_hidden).toBe(true);

    const notes = await db.query("SELECT type FROM notifications WHERE user_id = $1 AND entity_id = $2 ORDER BY created_at", [host.id, id]);
    expect(notes.rows.map((r) => r.type)).toEqual(['lecture_registration', 'lecture_question']);
  });

  it('cancelling notifies attendees and removes it from upcoming', async () => {
    const id = (await host.agent.post('/api/v1/lectures').send(lectureInput({ title: 'To be cancelled soon' }))).body.data.id;
    await student.agent.post(`/api/v1/lectures/${id}/register`);
    expect((await student.agent.post(`/api/v1/lectures/${id}/cancel`)).status).toBe(403);
    const cancelled = await host.agent.post(`/api/v1/lectures/${id}/cancel`);
    expect(cancelled.body.data.status).toBe('cancelled');

    const note = await db.query("SELECT 1 FROM notifications WHERE user_id = $1 AND entity_id = $2 AND type = 'lecture_cancelled'", [student.id, id]);
    expect(note.rows).toHaveLength(1);
    const upcoming = await request(app).get('/api/v1/lectures?q=To%20be%20cancelled');
    expect(upcoming.body.data.find((l) => l.id === id)).toBeUndefined();
    expect((await student.agent.post(`/api/v1/lectures/${id}/register`)).status).toBe(409);
  });

  it('returns 404 for malformed ids instead of a database error', async () => {
    expect((await request(app).get('/api/v1/lectures/not-a-uuid')).status).toBe(404);
  });
});
