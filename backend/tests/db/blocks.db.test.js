/** Blocking and muting, end to end against real Postgres. */
const { db, connect, close, signedInUser } = require('./helpers');

beforeAll(connect);
afterAll(close);

const post = async (author, caption = 'A result worth discussing') => {
  const { rows } = await db.query(
    "INSERT INTO posts (author_id, content_type, caption) VALUES ($1, 'text', $2) RETURNING id", [author.id, caption]);
  return rows[0].id;
};

const feedIds = async (user, query = {}) => {
  const res = await user.agent.get('/api/v1/posts/feed').query(query);
  return (res.body.data.posts || res.body.data || []).map((p) => p.id);
};

describe('blocking', () => {
  let alice; // blocks bob
  let bob;
  let carol; // bystander
  let alicePost;
  let bobPost;

  beforeAll(async () => {
    alice = await signedInUser({ name: 'Alice Blocker' });
    bob = await signedInUser({ name: 'Bob Blocked' });
    carol = await signedInUser({ name: 'Carol Bystander' });
    await alice.agent.post(`/api/v1/users/${bob.username}/follow`).expect(200);
    await bob.agent.post(`/api/v1/users/${alice.username}/follow`).expect(200);
    alicePost = await post(alice, 'Alice findings');
    bobPost = await post(bob, 'Bob findings');
    // A conversation that existed before the block.
    await bob.agent.post('/api/v1/messages/conversations').send({ username: alice.username }).expect(201);
    const res = await alice.agent.post(`/api/v1/users/${bob.username}/block`);
    expect(res.status).toBe(200);
  });

  it('removes follows both ways and prevents re-following', async () => {
    const { rowCount } = await db.query(
      'SELECT 1 FROM follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)',
      [alice.id, bob.id]);
    expect(rowCount).toBe(0);
    expect((await bob.agent.post(`/api/v1/users/${alice.username}/follow`)).status).toBe(403);
    expect((await alice.agent.post(`/api/v1/users/${bob.username}/follow`)).status).toBe(403);
  });

  it('makes the blocker invisible to the blocked user', async () => {
    expect((await bob.agent.get(`/api/v1/users/${alice.username}`)).status).toBe(404);
    expect((await bob.agent.get(`/api/v1/users/${alice.username}/posts`)).status).toBe(404);
    expect((await bob.agent.get(`/api/v1/users/${alice.username}/followers`)).status).toBe(404);
    expect((await bob.agent.get(`/api/v1/posts/${alicePost}`)).status).toBe(404);
    expect(await feedIds(bob)).not.toContain(alicePost);
    const search = await bob.agent.get('/api/v1/users/search').query({ q: alice.username });
    expect(search.body.data.map((u) => u.id)).not.toContain(alice.id);
    // Others are unaffected.
    expect((await carol.agent.get(`/api/v1/users/${alice.username}`)).status).toBe(200);
    expect(await feedIds(carol)).toEqual(expect.arrayContaining([alicePost, bobPost]));
  });

  it("lets the blocker still find the blocked profile (to unblock) but not their posts", async () => {
    const profile = await alice.agent.get(`/api/v1/users/${bob.username}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.is_blocked).toBe(true);
    expect(await feedIds(alice)).not.toContain(bobPost);
    expect((await alice.agent.get(`/api/v1/posts/${bobPost}`)).status).toBe(404);
  });

  it('stops comments, replies, reactions, saves, and their notifications', async () => {
    expect((await bob.agent.post(`/api/v1/posts/${alicePost}/comments`).send({ content: 'Hello' })).status).toBe(404);
    expect((await bob.agent.get(`/api/v1/posts/${alicePost}/comments`)).status).toBe(404);
    expect((await bob.agent.post('/api/v1/posts/react').send({ post_id: alicePost, reaction_type: 'novel' })).status).toBe(404);
    expect((await bob.agent.post(`/api/v1/posts/${alicePost}/bookmark`)).status).toBe(404);

    // On Carol's post, Bob's comment is hidden from Alice, he can't reply to her, and @mentions don't reach her.
    const carolPost = await post(carol);
    const aliceComment = await alice.agent.post(`/api/v1/posts/${carolPost}/comments`).send({ content: 'Interesting' });
    const bobComment = await bob.agent.post(`/api/v1/posts/${carolPost}/comments`)
      .send({ content: `Agree with @${alice.username}` });
    expect(bobComment.status).toBe(201);
    const reply = await bob.agent.post(`/api/v1/posts/${carolPost}/comments`)
      .send({ content: 'Replying', parent_id: aliceComment.body.data.id });
    expect(reply.status).toBe(403);
    const seenByAlice = await alice.agent.get(`/api/v1/posts/${carolPost}/comments`);
    expect(seenByAlice.body.data.map((c) => c.id)).not.toContain(bobComment.body.data.id);
    const seenByCarol = await carol.agent.get(`/api/v1/posts/${carolPost}/comments`);
    expect(seenByCarol.body.data.map((c) => c.id)).toContain(bobComment.body.data.id);
    const mention = await db.query("SELECT 1 FROM notifications WHERE user_id = $1 AND actor_id = $2 AND type = 'mention'", [alice.id, bob.id]);
    expect(mention.rowCount).toBe(0);
  });

  it('stops messages in both directions', async () => {
    expect((await bob.agent.post('/api/v1/messages/conversations').send({ username: alice.username })).status).toBe(403);
    const conv = (await alice.agent.get('/api/v1/messages/conversations')).body.data
      .find((c) => c.participants.some((p) => p.id === bob.id));
    expect(conv).toBeTruthy();
    expect((await bob.agent.post('/api/v1/messages/send').send({ conversationId: conv.id, content: 'hi' })).status).toBe(403);
    expect((await alice.agent.post('/api/v1/messages/send').send({ conversationId: conv.id, content: 'hi' })).status).toBe(403);
  });

  it('lists and lifts blocks', async () => {
    const list = await alice.agent.get('/api/v1/users/me/blocked');
    expect(list.body.data.blocked.map((u) => u.username)).toContain(bob.username);
    await alice.agent.delete(`/api/v1/users/${bob.username}/block`).expect(200);
    expect((await bob.agent.get(`/api/v1/users/${alice.username}`)).status).toBe(200);
    expect((await bob.agent.post(`/api/v1/users/${alice.username}/follow`)).status).toBe(200);
  });

  it("can't block yourself", async () => {
    expect((await alice.agent.post(`/api/v1/users/${alice.username}/block`)).status).toBe(400);
  });
});

describe('muting', () => {
  it('hides posts from the feed only, silently', async () => {
    const dana = await signedInUser({ name: 'Dana Muter' });
    const eve = await signedInUser({ name: 'Eve Muted' });
    await dana.agent.post(`/api/v1/users/${eve.username}/follow`).expect(200);
    const evePost = await post(eve, 'Eve update');
    expect(await feedIds(dana)).toContain(evePost);

    await dana.agent.post(`/api/v1/users/${eve.username}/mute`).expect(200);
    expect(await feedIds(dana)).not.toContain(evePost);
    expect(await feedIds(dana, { scope: 'following' })).not.toContain(evePost);
    // Still reachable on purpose: profile, the post itself, and following stays.
    const profile = await dana.agent.get(`/api/v1/users/${eve.username}`);
    expect(profile.body.data).toMatchObject({ is_muted: true, is_following: true });
    expect((await dana.agent.get(`/api/v1/users/${eve.username}/posts`)).body.data.map((p) => p.id)).toContain(evePost);
    // Eve can't tell: Dana's profile looks the same to her.
    const fromEve = await eve.agent.get(`/api/v1/users/${dana.username}`);
    expect(fromEve.status).toBe(200);
    expect(fromEve.body.data.is_muted).toBe(false);

    await dana.agent.delete(`/api/v1/users/${eve.username}/mute`).expect(200);
    expect(await feedIds(dana)).toContain(evePost);
  });
});
