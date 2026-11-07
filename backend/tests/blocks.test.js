const { app, request, db, createUser, resetDb, close } = require('./helpers');

let alice; let bob; let carol;
let bobPost;

beforeAll(async () => {
  await resetDb();
  alice = await createUser('blkalice');
  bob = await createUser('blkbob');
  carol = await createUser('blkcarol');
  await alice.agent.post('/api/v1/users/blkbob/follow');
  await bob.agent.post('/api/v1/users/blkalice/follow');
  bobPost = (await bob.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Bob post about #graphs' })).body.data.id;
  await carol.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Carol post' });
});
afterAll(close);

const notificationCount = async (userId) =>
  (await db.query('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1', [userId])).rows[0].n;

describe('blocking', () => {
  test('blocking removes follows both ways', async () => {
    expect((await alice.agent.post('/api/v1/users/blkbob/block')).status).toBe(200);
    const r = await db.query(
      `SELECT count(*)::int AS n FROM follows WHERE follower_id IN ($1, $2) AND following_id IN ($1, $2)`,
      [alice.user.id, bob.user.id]
    );
    expect(r.rows[0].n).toBe(0);
  });

  test('the blocked person sees the blocker as not found; the blocker sees a minimal profile', async () => {
    expect((await bob.agent.get('/api/v1/users/blkalice')).status).toBe(404);
    expect((await bob.agent.get('/api/v1/users/blkalice/followers')).status).toBe(404);
    const mine = await alice.agent.get('/api/v1/users/blkbob');
    expect(mine.status).toBe(200);
    expect(mine.body.data).toMatchObject({ is_blocked: true, post_count: 0 });
    expect(mine.body.data).not.toHaveProperty('bio');
  });

  test('posts disappear in both directions, including search and saved', async () => {
    const feed = await alice.agent.get('/api/v1/posts/feed');
    expect(feed.body.data.posts.some((p) => p.author_id === bob.user.id)).toBe(false);
    expect((await alice.agent.get(`/api/v1/posts/${bobPost}`)).status).toBe(404);
    const search = await alice.agent.get('/api/v1/search?q=graphs');
    expect((search.body.data.posts || []).length).toBe(0);
    const users = await bob.agent.get('/api/v1/search?q=blkalice&type=users');
    expect(users.body.data.users).toHaveLength(0);
  });

  test('no follows, likes, comments, saves or messages across a block', async () => {
    expect((await bob.agent.post('/api/v1/users/blkalice/follow')).status).toBe(403);
    expect((await alice.agent.post(`/api/v1/posts/${bobPost}/like`)).status).toBe(404);
    expect((await alice.agent.post(`/api/v1/posts/${bobPost}/bookmark`)).status).toBe(404);
    expect((await alice.agent.post(`/api/v1/posts/${bobPost}/comments`).send({ content: 'hi' })).status).toBe(404);
    expect((await bob.agent.post('/api/v1/messages/conversations').send({ username: 'blkalice' })).status).toBe(403);
  });

  test('mentions across a block do not notify', async () => {
    const before = await notificationCount(alice.user.id);
    await bob.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'hey @blkalice' });
    expect(await notificationCount(alice.user.id)).toBe(before);
  });

  test('an existing conversation becomes read-only', async () => {
    await alice.agent.delete('/api/v1/users/blkbob/block');
    const convo = (await alice.agent.post('/api/v1/messages/conversations').send({ username: 'blkbob' })).body.data;
    expect((await alice.agent.post('/api/v1/messages/send').send({ conversation_id: convo.id, content: 'before' })).status).toBe(201);
    await bob.agent.post('/api/v1/users/blkalice/block');
    const listed = await alice.agent.get(`/api/v1/messages/conversations/${convo.id}`);
    expect(listed.body.data.is_blocked).toBe(true);
    expect((await alice.agent.post('/api/v1/messages/send').send({ conversation_id: convo.id, content: 'after' })).status).toBe(403);
    await bob.agent.delete('/api/v1/users/blkalice/block');
  });

  test('the block list shows blocked and muted accounts; you cannot block yourself', async () => {
    await alice.agent.post('/api/v1/users/blkbob/block');
    await alice.agent.post('/api/v1/users/blkcarol/mute');
    const r = await alice.agent.get('/api/v1/users/me/blocks');
    expect(r.body.data.blocked.map((u) => u.username)).toEqual(['blkbob']);
    expect(r.body.data.muted.map((u) => u.username)).toEqual(['blkcarol']);
    expect((await alice.agent.post('/api/v1/users/blkalice/block')).status).toBe(400);
  });
});

describe('muting', () => {
  test("muted accounts leave the feed but their profile and interactions still work", async () => {
    const feed = await alice.agent.get('/api/v1/posts/feed');
    expect(feed.body.data.posts.some((p) => p.author_id === carol.user.id)).toBe(false);
    const profileFeed = await alice.agent.get('/api/v1/posts/feed?author=blkcarol');
    expect(profileFeed.body.data.posts.length).toBe(1);
    expect((await alice.agent.post('/api/v1/users/blkcarol/follow')).status).toBe(200);
    const profile = await alice.agent.get('/api/v1/users/blkcarol');
    expect(profile.body.data.is_muted).toBe(true);
    await alice.agent.delete('/api/v1/users/blkcarol/mute');
    const after = await alice.agent.get('/api/v1/posts/feed');
    expect(after.body.data.posts.some((p) => p.author_id === carol.user.id)).toBe(true);
  });

  test('signed-out visitors are unaffected', async () => {
    const r = await request(app).get(`/api/v1/posts/${bobPost}`);
    expect(r.status).toBe(200);
  });
});
