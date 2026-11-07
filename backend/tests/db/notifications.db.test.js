const { request, app, db, redis, outbox, connect, close, signedInUser } = require('./helpers');
const notificationEmails = require('../../src/services/notificationEmailService');
const prefs = require('../../src/services/emailPreferences');

beforeAll(connect);
afterAll(close);

const latestNotification = async (userId, type) =>
  (await db.query('SELECT id FROM notifications WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1', [userId, type])).rows[0]?.id;

const emailsTo = (to) => outbox.filter((m) => m.to === to);

describe('email notifications (real Postgres + Redis)', () => {
  let author;
  let reader;
  let postId;

  beforeAll(async () => {
    author = await signedInUser({ name: 'Ada Author' });
    reader = await signedInUser({ name: 'Rita Reader' });
    const post = await author.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Our new result on photonic qubits' });
    postId = post.body.data.id;
  });

  it('emails the author about a comment, with unsubscribe link and headers', async () => {
    await reader.agent.post(`/api/v1/posts/${postId}/comments`).send({ content: 'Which detectors did you use?' });
    const id = await latestNotification(author.id, 'comment');
    expect(await notificationEmails.deliver(id)).toBe('sent');

    const mail = emailsTo(author.email).pop();
    expect(mail.subject).toBe('Rita Reader commented on your post');
    expect(mail.html).toContain('Which detectors did you use?');
    expect(mail.html).toContain(`http://web.test/post/${postId}`);
    expect(mail.headers['List-Unsubscribe']).toMatch(/^<http:\/\/api\.test\/api\/v1\/notifications\/unsubscribe\?token=/);
    expect(mail.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');

    // Delivering the same notification again does nothing.
    expect(await notificationEmails.deliver(id)).toBe('already-sent');
  });

  it('throttles bursts of comments on the same post', async () => {
    await reader.agent.post(`/api/v1/posts/${postId}/comments`).send({ content: 'And the dark counts?' });
    expect(await notificationEmails.deliver(await latestNotification(author.id, 'comment'))).toBe('throttled');
  });

  it('respects preferences, and reactions are off by default', async () => {
    const reacted = await reader.agent.post('/api/v1/posts/react').send({ post_id: postId, reaction_type: 'interesting' });
    expect(reacted.status).toBe(200);
    const reactionId = await latestNotification(author.id, 'reaction');
    expect(reactionId).toBeDefined();
    expect(await notificationEmails.deliver(reactionId)).toBe('opted-out');

    const off = await author.agent.put('/api/v1/notifications/email-preferences').send({ categories: { follows: false } });
    expect(off.body.data.categories.find((c) => c.key === 'follows').enabled).toBe(false);
    await reader.agent.post(`/api/v1/users/${author.username}/follow`);
    expect(await notificationEmails.deliver(await latestNotification(author.id, 'follow'))).toBe('opted-out');
  });

  it('one-click unsubscribe works without signing in and rejects tampered tokens', async () => {
    const token = prefs.unsubscribeToken(author.id, 'comments');
    expect((await request(app).post(`/api/v1/notifications/unsubscribe?token=${token.slice(0, -2)}xx`)).status).toBe(400);
    const res = await request(app).post(`/api/v1/notifications/unsubscribe?token=${encodeURIComponent(token)}`).type('form').send({ 'List-Unsubscribe': 'One-Click' });
    expect(res.status).toBe(200);
    const stored = await author.agent.get('/api/v1/notifications/email-preferences');
    expect(stored.body.data.categories.find((c) => c.key === 'comments').enabled).toBe(false);
  });

  it('never emails unverified accounts', async () => {
    const pending = await signedInUser();
    await db.query("UPDATE users SET verification_status = 'unverified' WHERE id = $1", [pending.id]);
    await author.agent.post(`/api/v1/users/${pending.username}/follow`);
    expect(await notificationEmails.deliver(await latestNotification(pending.id, 'follow'))).toBe('no-address');
  });

  it('sends each lecture reminder once, in the attendee\'s time zone', async () => {
    const host = await signedInUser({ verification: 'faculty', name: 'Prof Host' });
    const attendee = await signedInUser({ name: 'Ann Attendee' });
    await attendee.agent.put('/api/v1/notifications/email-preferences').send({ timezone: 'Asia/Kolkata' });

    const startsAt = new Date(Date.now() + 40 * 60 * 1000);
    const lecture = await host.agent.post('/api/v1/lectures').send({
      title: 'Reminder timing lecture', topic: 'Physics', starts_at: startsAt.toISOString(), duration_minutes: 30,
    });
    const id = lecture.body.data.id;
    await attendee.agent.post(`/api/v1/lectures/${id}/register`);

    await notificationEmails.sendLectureReminders();
    await notificationEmails.sendLectureReminders(); // second sweep must not duplicate

    const kinds = await db.query('SELECT kind FROM lecture_reminders WHERE lecture_id = $1', [id]);
    expect(kinds.rows.map((r) => r.kind)).toEqual(['1h']); // too close for the 24h reminder
    const notes = await db.query("SELECT id, user_id FROM notifications WHERE type = 'lecture_reminder' AND entity_id = $1", [id]);
    expect(notes.rows.map((r) => r.user_id).sort()).toEqual([host.id, attendee.id].sort());

    const attendeeNote = notes.rows.find((r) => r.user_id === attendee.id).id;
    expect(await notificationEmails.deliver(attendeeNote)).toBe('sent');
    const mail = emailsTo(attendee.email).pop();
    expect(mail.subject).toBe('Starting soon: Reminder timing lecture');
    expect(mail.html).toContain(notificationEmails.formatWhen(startsAt.toISOString(), 'Asia/Kolkata'));
    expect(mail.html).toContain('GMT+5:30');
  });

  afterAll(async () => {
    const keys = await redis.client.keys('emailthrottle:*');
    if (keys.length) await redis.client.del(keys);
  });
});
