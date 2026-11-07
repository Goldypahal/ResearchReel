const { app, request, db, redisClient, createUser, resetDb, close } = require('./helpers');
const { outbox } = require('../src/utils/emailService');
const notificationEmails = require('../src/services/notificationEmailService');
const prefs = require('../src/services/emailPreferences');

let author; let reader; let postId;

const latestNotification = async (userId, type) =>
  (await db.query('SELECT id FROM notifications WHERE user_id = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1', [userId, type])).rows[0]?.id;

beforeAll(async () => {
  await resetDb();
  author = await createUser('mailauthor');
  reader = await createUser('mailreader');
  postId = (await author.agent.post('/api/v1/posts/create').send({ content_type: 'text', caption: 'Email test post' })).body.data.id;
});
beforeEach(async () => {
  outbox.length = 0;
  const keys = await redisClient.client.keys('emailthrottle:*');
  if (keys.length) await redisClient.client.del(keys);
});
afterAll(close);

describe('notification emails', () => {
  test('a comment emails the post author with an unsubscribe link and one-click headers', async () => {
    await reader.agent.post(`/api/v1/posts/${postId}/comments`).send({ content: 'Great figure on page 3' });
    const id = await latestNotification(author.user.id, 'comment');
    expect(await notificationEmails.deliver(id)).toBe('sent');
    expect(outbox).toHaveLength(1);
    const mail = outbox[0];
    expect(mail.to).toBe('mailauthor@example.com');
    expect(mail.subject).toMatch(/commented on your post/);
    expect(mail.text).toContain('Great figure on page 3');
    expect(mail.headers['List-Unsubscribe']).toMatch(/\/api\/v1\/notifications\/unsubscribe\?token=/);
    expect(mail.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
    // Delivered once only.
    expect(await notificationEmails.deliver(id)).toBe('already-sent');
  });

  test('bursts of activity on the same post are throttled', async () => {
    await reader.agent.post(`/api/v1/posts/${postId}/comments`).send({ content: 'first' });
    expect(await notificationEmails.deliver(await latestNotification(author.user.id, 'comment'))).toBe('sent');
    await reader.agent.post(`/api/v1/posts/${postId}/comments`).send({ content: 'second' });
    expect(await notificationEmails.deliver(await latestNotification(author.user.id, 'comment'))).toBe('throttled');
  });

  test('likes are off by default', async () => {
    await reader.agent.post(`/api/v1/posts/${postId}/like`);
    expect(await notificationEmails.deliver(await latestNotification(author.user.id, 'like'))).toBe('opted-out');
  });

  test('preferences can be read and changed, with time zone validation', async () => {
    const r = await author.agent.get('/api/v1/notifications/email-preferences');
    expect(r.body.data.categories.find((c) => c.key === 'comments').enabled).toBe(true);
    expect((await author.agent.put('/api/v1/notifications/email-preferences').send({ timezone: 'Mars/Olympus' })).status).toBe(400);
    const u = await author.agent.put('/api/v1/notifications/email-preferences').send({ categories: { follows: false }, timezone: 'Asia/Kolkata' });
    expect(u.body.data.timezone).toBe('Asia/Kolkata');
    expect(u.body.data.categories.find((c) => c.key === 'follows').enabled).toBe(false);
    await reader.agent.post('/api/v1/users/mailauthor/follow');
    expect(await notificationEmails.deliver(await latestNotification(author.user.id, 'follow'))).toBe('opted-out');
  });

  test('one-click unsubscribe works without signing in, and rejects forged tokens', async () => {
    const token = prefs.unsubscribeToken(author.user.id, 'comments');
    expect((await request(app).post(`/api/v1/notifications/unsubscribe?token=${encodeURIComponent(token)}`)
      .type('form').send('List-Unsubscribe=One-Click')).status).toBe(200);
    const after = await author.agent.get('/api/v1/notifications/email-preferences');
    expect(after.body.data.categories.find((c) => c.key === 'comments').enabled).toBe(false);
    const forged = `${reader.user.id}.comments.${token.split('.')[2]}`;
    expect((await request(app).post(`/api/v1/notifications/unsubscribe?token=${encodeURIComponent(forged)}`)).status).toBe(400);
    expect((await request(app).get(`/api/v1/notifications/unsubscribe?token=${encodeURIComponent(token)}`)).status).not.toBe(200);
  });
});

describe('lectures', () => {
  let lectureId;

  test('reminders go to attendees and the host once, an hour before', async () => {
    const soon = new Date(Date.now() + 40 * 60 * 1000).toISOString();
    lectureId = (await author.agent.post('/api/v1/lectures').send({ title: 'Reminder lecture', scheduled_at: soon })).body.data.id;
    await reader.agent.post(`/api/v1/lectures/${lectureId}/attend`);

    const created = await notificationEmails.sendLectureReminders();
    expect(created).toBe(2);
    expect(await notificationEmails.sendLectureReminders()).toBe(0);
    const id = await latestNotification(reader.user.id, 'lecture_reminder');
    expect(await notificationEmails.deliver(id)).toBe('sent');
    expect(outbox[0].subject).toBe('Starting soon: Reminder lecture');
  });

  test('a calendar file can be downloaded', async () => {
    const r = await request(app).get(`/api/v1/lectures/${lectureId}/calendar.ics`);
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/calendar/);
    expect(r.text).toMatch(/BEGIN:VEVENT[\s\S]*DTSTART:\d{8}T\d{6}Z[\s\S]*SUMMARY:Reminder lecture/);
  });

  test('cancelling an upcoming lecture notifies and emails attendees', async () => {
    const r = await author.agent.delete(`/api/v1/lectures/${lectureId}`);
    expect(r.body.message).toMatch(/notified/);
    const id = await latestNotification(reader.user.id, 'lecture_cancelled');
    expect(await notificationEmails.deliver(id)).toBe('sent');
    expect(outbox[0].subject).toBe('Cancelled: Reminder lecture');
  });
});
