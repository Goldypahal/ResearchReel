const path = require('path');
const { app, request, createUser, resetDb, close } = require('./helpers');

let alice; let bob;
beforeAll(async () => {
  await resetDb();
  alice = await createUser('alice');
  bob = await createUser('bob');
});
afterAll(close);

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');

describe('posts', () => {
  let postId;

  test('create text post with hashtags and mentions', async () => {
    const r = await alice.agent.post('/api/v1/posts').send({ caption: 'Hello #Physics world @bob' });
    expect(r.status).toBe(201);
    expect(r.body.data.tags).toEqual(['Physics']);
    expect(r.body.data.username).toBe('alice');
    postId = r.body.data.id;
    const n = await bob.agent.get('/api/v1/notifications');
    expect(n.body.data.notifications.some((x) => x.type === 'mention')).toBe(true);
  });

  test('empty posts and spam are rejected', async () => {
    expect((await alice.agent.post('/api/v1/posts').send({ caption: '' })).status).toBe(400);
    expect((await alice.agent.post('/api/v1/posts').send({ caption: 'buy bitcoin now' })).status).toBe(400);
  });

  test('image upload and fake image rejection', async () => {
    const ok = await alice.agent.post('/api/v1/posts').field('caption', 'figure').attach('images', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.content_type).toBe('image');
    expect(ok.body.data.media_urls[0]).toMatch(/^\/uploads\/posts\//);
    const file = await request(app).get(ok.body.data.media_urls[0]);
    expect(file.status).toBe(200);

    const fake = await alice.agent.post('/api/v1/posts').field('caption', 'x').attach('images', Buffer.from('<script>alert(1)</script>'), { filename: 'a.png', contentType: 'image/png' });
    expect(fake.status).toBe(400);
  });

  test('like / unlike, comment, bookmark with counts and viewer state', async () => {
    expect((await bob.agent.post(`/api/v1/posts/${postId}/like`)).body.data.like_count).toBe(1);
    expect((await bob.agent.post(`/api/v1/posts/${postId}/like`)).body.data.like_count).toBe(1); // idempotent
    const c = await bob.agent.post(`/api/v1/posts/${postId}/comments`).send({ content: 'Great!' });
    expect(c.status).toBe(201);
    await bob.agent.post(`/api/v1/posts/${postId}/bookmark`);

    const p = await bob.agent.get(`/api/v1/posts/${postId}`);
    expect(p.body.data).toMatchObject({ like_count: 1, comment_count: 1, is_liked: true, is_bookmarked: true });

    const saved = await bob.agent.get('/api/v1/posts/saved');
    expect(saved.body.data.posts.map((x) => x.id)).toContain(postId);

    const un = await bob.agent.delete(`/api/v1/posts/${postId}/like`);
    expect(un.body.data.like_count).toBe(0);
  });

  test('users cannot delete each other\'s posts or comments', async () => {
    expect((await bob.agent.delete(`/api/v1/posts/${postId}`)).status).toBe(404);
    const comments = await request(app).get(`/api/v1/posts/${postId}/comments`);
    const commentId = comments.body.data.comments[0].id;
    const other = await createUser('carol');
    expect((await other.agent.delete(`/api/v1/posts/comments/${commentId}`)).status).toBe(404);
    // Post author can moderate comments on their own post.
    expect((await alice.agent.delete(`/api/v1/posts/comments/${commentId}`)).status).toBe(200);
    expect((await alice.agent.delete(`/api/v1/posts/${postId}`)).status).toBe(200);
    expect((await request(app).get(`/api/v1/posts/${postId}`)).status).toBe(404);
  });

  test('invalid ids return 404, not 500', async () => {
    expect((await request(app).get('/api/v1/posts/not-a-uuid')).status).toBe(404);
    expect((await request(app).get('/api/v1/users/doesnotexist')).status).toBe(404);
  });
});

describe('follows, feed and profiles', () => {
  test('follow, following feed, profile counts, unfollow', async () => {
    await alice.agent.post('/api/v1/posts').send({ caption: 'from alice' });
    expect((await bob.agent.post('/api/v1/users/alice/follow')).body.data.followers_count).toBe(1);
    expect((await bob.agent.post('/api/v1/users/bob/follow')).status).toBe(400);

    const feed = await bob.agent.get('/api/v1/posts/feed?scope=following');
    expect(feed.body.data.posts.some((p) => p.caption === 'from alice')).toBe(true);

    const prof = await bob.agent.get('/api/v1/users/alice');
    expect(prof.body.data).toMatchObject({ followers_count: 1, is_following: true });
    expect(prof.body.data).not.toHaveProperty('email');

    const followers = await request(app).get('/api/v1/users/alice/followers');
    expect(followers.body.data.users[0].username).toBe('bob');

    await bob.agent.delete('/api/v1/users/alice/follow');
    expect((await bob.agent.get('/api/v1/users/alice')).body.data.is_following).toBe(false);
  });

  test('profile update validates input', async () => {
    const ok = await alice.agent.put('/api/v1/users/me').send({ bio: 'Physicist', institution: 'MIT', research_interests: ['Physics'] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.institution).toBe('MIT');
    expect((await alice.agent.put('/api/v1/users/me').send({ website: 'javascript:alert(1)' })).status).toBe(400);
    expect((await alice.agent.put('/api/v1/users/me').send({ username: 'bob' })).status).toBe(409);
  });

  test('avatar upload', async () => {
    const r = await alice.agent.post('/api/v1/users/me/avatar').attach('avatar', PNG, { filename: 'me.png', contentType: 'image/png' });
    expect(r.status).toBe(200);
    expect(r.body.data.avatar_url).toMatch(/^\/uploads\/avatars\//);
  });
});

describe('search, discover, leaderboard, achievements', () => {
  test('search finds people, posts and tags', async () => {
    await alice.agent.post('/api/v1/posts').send({ caption: 'Quantum gravity notes #quantum' });
    const s = await request(app).get('/api/v1/search?q=quantum');
    expect(s.body.data.posts.length).toBeGreaterThan(0);
    const t = await request(app).get('/api/v1/search?q=%23quantum&type=posts');
    expect(t.body.data.posts.length).toBe(1);
    const u = await request(app).get('/api/v1/search?q=bob&type=users');
    expect(u.body.data.users[0].username).toBe('bob');
    expect((await request(app).get('/api/v1/search?q=')).status).toBe(400);
  });

  test('discover, explore, leaderboard, achievements respond', async () => {
    expect((await request(app).get('/api/v1/discover')).status).toBe(200);
    expect((await request(app).get('/api/v1/explore')).status).toBe(200);
    const lb = await request(app).get('/api/v1/leaderboard?period=all');
    expect(lb.body.data.leaders[0].username).toBe('alice');
    const ach = await alice.agent.get('/api/v1/achievements');
    expect(ach.body.data.badges.find((b) => b.id === 'first_post').unlocked).toBe(true);
  });
});

describe('stories', () => {
  test('followers see stories; views are tracked', async () => {
    await bob.agent.post('/api/v1/users/alice/follow');
    const s = await alice.agent.post('/api/v1/stories').field('text', 'today in the lab');
    expect(s.status).toBe(201);
    const list = await bob.agent.get('/api/v1/stories');
    const group = list.body.data.find((g) => g.username === 'alice');
    expect(group.stories[0].viewed).toBe(false);
    await bob.agent.post(`/api/v1/stories/${s.body.data.id}/view`);
    const viewers = await alice.agent.get(`/api/v1/stories/${s.body.data.id}/viewers`);
    expect(viewers.body.data[0].username).toBe('bob');
    expect((await bob.agent.get(`/api/v1/stories/${s.body.data.id}/viewers`)).status).toBe(404);
  });
});
