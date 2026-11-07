const { request, app, db, connect, close, signedInUser } = require('./helpers');
const notificationEmails = require('../../src/services/notificationEmailService');
const { extractMentions } = require('../../src/services/commentService');

beforeAll(connect);
afterAll(close);

const notesFor = async (userId, postId) =>
  (await db.query('SELECT type FROM notifications WHERE user_id = $1 AND entity_id = $2 ORDER BY created_at', [userId, postId])).rows.map((r) => r.type);

describe('threaded comments (real Postgres)', () => {
  let author; let alice; let bob; let postId;
  const url = () => `/api/v1/posts/${postId}/comments`;

  beforeAll(async () => {
    author = await signedInUser({ name: 'Post Author' });
    alice = await signedInUser({ name: 'Alice' });
    bob = await signedInUser({ name: 'Bob' });
    postId = (await author.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Threads test post' })).body.data.id;
  });

  it('parses @mentions', () => {
    expect(extractMentions('thanks @ada_l and @Grace.H. — cc @ada_l, email a@b.com @x')).toEqual(['ada_l', 'grace.h']);
  });

  it('keeps threads two levels deep and records who was answered', async () => {
    const top = (await alice.agent.post(url()).send({ content: 'Top-level question' })).body.data;
    expect(top.parent_id).toBeNull();

    const reply = (await bob.agent.post(url()).send({ content: 'A reply', parent_id: top.id })).body.data;
    expect(reply.parent_id).toBe(top.id);
    expect(reply.reply_to_username).toBe(alice.username);

    // Replying to the reply attaches to the same top-level comment.
    const nested = (await alice.agent.post(url()).send({ content: 'Reply to the reply', parent_id: reply.id })).body.data;
    expect(nested.parent_id).toBe(top.id);
    expect(nested.reply_to_username).toBe(bob.username);

    const list = (await request(app).get(url())).body.data;
    expect(list).toHaveLength(1);
    expect(list[0].reply_count).toBe(2);
    const replies = (await request(app).get(`${url()}/${top.id}/replies`)).body.data;
    expect(replies.map((r) => r.content)).toEqual(['A reply', 'Reply to the reply']);
  });

  it('rejects replies to comments on another post or deleted comments', async () => {
    const other = (await author.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Other post' })).body.data.id;
    const foreign = (await bob.agent.post(`/api/v1/posts/${other}/comments`).send({ content: 'elsewhere' })).body.data;
    expect((await alice.agent.post(url()).send({ content: 'x', parent_id: foreign.id })).status).toBe(404);

    const gone = (await bob.agent.post(url()).send({ content: 'soon deleted' })).body.data;
    await bob.agent.delete(`${url()}/${gone.id}`);
    expect((await alice.agent.post(url()).send({ content: 'x', parent_id: gone.id })).status).toBe(404);
  });

  it('notifies each person once: mention beats reply beats comment', async () => {
    const pid = (await author.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Notify test' })).body.data.id;
    const curl = `/api/v1/posts/${pid}/comments`;
    const top = (await alice.agent.post(curl).send({ content: 'First' })).body.data;
    expect(await notesFor(author.id, pid)).toEqual(['comment']);

    // Bob replies to Alice and mentions the author and Alice: Alice gets one "mention", author one "mention".
    await bob.agent.post(curl).send({ content: `@${alice.username} agreed, and @${author.username} should see this`, parent_id: top.id });
    expect(await notesFor(alice.id, pid)).toEqual(['mention']);
    expect(await notesFor(author.id, pid)).toEqual(['comment', 'mention']);

    // A plain reply notifies the person replied to and the post author.
    await author.agent.post(curl).send({ content: 'Thanks both', parent_id: top.id });
    expect(await notesFor(alice.id, pid)).toEqual(['mention', 'reply']);
    expect(await notesFor(bob.id, pid)).toEqual([]);

    // Mentions email under the "comments" setting.
    const id = (await db.query("SELECT id FROM notifications WHERE user_id = $1 AND entity_id = $2 AND type = 'mention'", [alice.id, pid])).rows[0].id;
    expect(await notificationEmails.deliver(id)).toBe('sent');
  });

  it('edits are author-only and marked edited', async () => {
    const c = (await alice.agent.post(url()).send({ content: 'Typo here' })).body.data;
    expect((await bob.agent.patch(`${url()}/${c.id}`).send({ content: 'hijack' })).status).toBe(403);
    const edited = await alice.agent.patch(`${url()}/${c.id}`).send({ content: 'Fixed typo' });
    expect(edited.status).toBe(200);
    expect(edited.body.data.content).toBe('Fixed typo');
    expect(edited.body.data.edited_at).toBeTruthy();
  });

  it('likes count once per person and sort=top ranks liked comments first', async () => {
    const pid = (await author.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Sort test' })).body.data.id;
    const curl = `/api/v1/posts/${pid}/comments`;
    const older = (await alice.agent.post(curl).send({ content: 'older' })).body.data;
    const liked = (await bob.agent.post(curl).send({ content: 'liked one' })).body.data;
    await alice.agent.post(`${curl}/${liked.id}/like`);
    const again = await alice.agent.post(`${curl}/${liked.id}/like`);
    expect(again.body.data).toMatchObject({ like_count: 1, viewer_liked: true });
    await author.agent.post(`${curl}/${liked.id}/like`);

    const top = (await alice.agent.get(`${curl}?sort=top`)).body.data;
    expect(top.map((c) => c.id)).toEqual([liked.id, older.id]);
    expect(top[0]).toMatchObject({ like_count: 2, viewer_liked: true });
    const newest = (await request(app).get(`${curl}?sort=new`)).body.data;
    expect(newest.map((c) => c.id)).toEqual([liked.id, older.id]); // newest first

    const unliked = await alice.agent.delete(`${curl}/${liked.id}/like`);
    expect(unliked.body.data).toMatchObject({ like_count: 1, viewer_liked: false });
  });

  it('deleting a comment with replies leaves a tombstone; without replies it disappears', async () => {
    const pid = (await author.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Delete test' })).body.data.id;
    const curl = `/api/v1/posts/${pid}/comments`;
    const parent = (await alice.agent.post(curl).send({ content: 'will be deleted' })).body.data;
    await bob.agent.post(curl).send({ content: 'still here', parent_id: parent.id });
    const lonely = (await bob.agent.post(curl).send({ content: 'no replies' })).body.data;

    expect((await bob.agent.delete(`${curl}/${parent.id}`)).status).toBe(404); // not Bob's, not his post
    expect((await alice.agent.delete(`${curl}/${parent.id}`)).status).toBe(200);
    expect((await author.agent.delete(`${curl}/${lonely.id}`)).status).toBe(200); // post author can moderate

    const list = (await request(app).get(curl)).body.data;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: parent.id, is_deleted: true, content: null, username: null, reply_count: 1 });
    expect((await request(app).get(`${curl}/${parent.id}/replies`)).body.data[0].content).toBe('still here');
  });

  it('paginates top-level comments', async () => {
    const pid = (await author.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Paging' })).body.data.id;
    const curl = `/api/v1/posts/${pid}/comments`;
    for (let i = 0; i < 5; i += 1) await alice.agent.post(curl).send({ content: `c${i}` });
    const first = await request(app).get(`${curl}?sort=new&limit=3`);
    expect(first.body.data).toHaveLength(3);
    const second = await request(app).get(`${curl}?sort=new&limit=3&cursor=${first.body.nextCursor}`);
    expect(second.body.data).toHaveLength(2);
    expect(second.body.nextCursor).toBeNull();
    expect(new Set([...first.body.data, ...second.body.data].map((c) => c.id)).size).toBe(5);
  });

  it('counts replies in the post comment count but not deleted ones', async () => {
    const post = (await request(app).get(`/api/v1/posts/${postId}`)).body.data;
    const live = (await db.query('SELECT COUNT(*)::int AS n FROM comments WHERE post_id = $1 AND deleted_at IS NULL', [postId])).rows[0].n;
    expect(post.comment_count).toBe(live);
  });
});
