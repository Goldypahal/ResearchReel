const { request, app, db, createUser, resetDb, close } = require('./helpers');
const { toReel, order, ensureSystemUser, upsertBatch } = require('../src/scripts/importYoutubePicks');

const row = (id, title, extra = {}) => ({
  source: 'hackertube', id, title, creator: 'Some Channel', topic: 'linear algebra',
  description: `About ${title}`, notes: 'area=Mathematics; type=lecture; hn_score=10; categories=Pure mathematics; why_hn=Clear and visual', ...extra,
});

let alice; let picksId; let community;
const importRows = async (rows) => {
  const authorId = await ensureSystemUser();
  const reels = order(rows.map(toReel).filter(Boolean));
  await upsertBatch(authorId, reels, 1);
  return authorId;
};

beforeAll(async () => {
  await resetDb();
  alice = await createUser('pickalice');
  picksId = await importRows([
    row('aaaaaaaaaaa', 'Vectors explained'), row('bbbbbbbbbbb', 'Matrices explained'),
    row('ccccccccccc', 'Quantum lecture', { source: 'youtube', topic: 'quantum physics lecture', notes: '' }),
  ]);
  const ins = await db.query(
    `INSERT INTO videos (author_id, title, video_url) VALUES ($1, 'Alice community reel', '/uploads/reels/a.mp4') RETURNING id`,
    [alice.user.id]
  );
  community = ins.rows[0].id;
});
afterAll(close);

describe('Research Picks (embedded YouTube reels)', () => {
  test('import is idempotent and keeps moderator deletions', async () => {
    const first = await db.query(`SELECT id FROM videos WHERE external_id = 'aaaaaaaaaaa'`);
    await db.query('UPDATE videos SET deleted_at = NOW() WHERE external_id = $1', ['bbbbbbbbbbb']);
    await importRows([row('aaaaaaaaaaa', 'Vectors explained (updated)'), row('bbbbbbbbbbb', 'Matrices explained')]);
    const r = await db.query(`SELECT id, title, deleted_at FROM videos WHERE source_type = 'youtube_embed' ORDER BY external_id`);
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0]).toMatchObject({ id: first.rows[0].id, title: 'Vectors explained (updated)' });
    expect(r.rows[1].deleted_at).not.toBeNull();
    await db.query('UPDATE videos SET deleted_at = NULL WHERE external_id = $1', ['bbbbbbbbbbb']);
  });

  test('the picks feed is ordered by rank and pages with a numeric cursor', async () => {
    const p1 = await request(app).get('/api/v1/reels?source=picks&limit=2');
    expect(p1.status).toBe(200);
    expect(p1.body.data.reels).toHaveLength(2);
    expect(p1.body.data.reels[0]).toMatchObject({
      source_type: 'youtube_embed', username: 'researchreel_picks',
      video_url: expect.stringMatching(/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}$/),
      source_url: expect.stringContaining('youtube.com/watch?v='),
    });
    const ranks = p1.body.data.reels.map((r) => r.pick_rank);
    expect(ranks[0]).toBeLessThan(ranks[1]);
    const p2 = await request(app).get(`/api/v1/reels?source=picks&limit=2&cursor=${p1.body.data.nextCursor}`);
    expect(p2.body.data.reels).toHaveLength(1);
    expect(p2.body.data.nextCursor).toBeNull();
  });

  test('the default feed and Explore show community reels only', async () => {
    const r = await request(app).get('/api/v1/reels');
    expect(r.body.data.reels.map((x) => x.id)).toEqual([community]);
    const ex = await request(app).get('/api/v1/explore');
    expect(ex.body.data.every((x) => x.type !== 'reel' || x.source_type === 'upload')).toBe(true);
    const mine = await request(app).get('/api/v1/reels?author=researchreel_picks');
    expect(mine.body.data.reels).toHaveLength(3);
  });

  test('picks can be liked, saved, commented on and found in search', async () => {
    const pick = (await db.query(`SELECT id FROM videos WHERE external_id = 'aaaaaaaaaaa'`)).rows[0].id;
    expect((await alice.agent.post(`/api/v1/reels/${pick}/like`)).body.data.like_count).toBe(1);
    expect((await alice.agent.post(`/api/v1/reels/${pick}/save`)).status).toBe(200);
    expect((await alice.agent.post(`/api/v1/reels/${pick}/comments`).send({ content: 'Great lecture' })).status).toBe(201);
    const s = await request(app).get('/api/v1/search?q=Vectors&type=reels');
    expect(s.body.data.reels.map((x) => x.id)).toContain(pick);
  });

  test('the house account gets no notifications, is not ranked and cannot sign in', async () => {
    await alice.agent.post('/api/v1/users/researchreel_picks/follow');
    const n = await db.query('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1', [picksId]);
    expect(n.rows[0].n).toBe(0);
    const lb = await request(app).get('/api/v1/leaderboard?period=all');
    expect(lb.body.data.leaders.map((x) => x.username)).not.toContain('researchreel_picks');
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'picks@researchreel.invalid', password: 'anything-at-all' });
    expect(login.status).toBeGreaterThanOrEqual(400);
  });

  test('the database rejects malformed YouTube ids', async () => {
    await expect(db.query(
      `INSERT INTO videos (author_id, title, video_url, source_type, external_id) VALUES ($1, 'x', 'x', 'youtube_embed', 'not-an-id')`,
      [picksId]
    )).rejects.toThrow(/videos_youtube_id_check/);
  });
});
