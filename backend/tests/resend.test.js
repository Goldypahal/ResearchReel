/**
 * Resend delivery. The Resend API is stubbed: this checks the request we send
 * and how failures are handled, without sending real email.
 */
const emailService = require('../src/utils/emailService');

const env = { ...process.env };
let calls;

beforeEach(() => {
  calls = [];
  process.env.NODE_ENV = 'production'; // the test outbox is bypassed outside NODE_ENV=test
  process.env.RESEND_API_KEY = 're_test_key';
  delete process.env.EMAIL_FROM;
  global.fetch = jest.fn(async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: 'email_123' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
});
afterEach(() => {
  process.env = { ...env };
  delete global.fetch;
});

test('sends through the Resend API with the key, sender, and unsubscribe headers', async () => {
  process.env.EMAIL_FROM = 'ResearchReel <no-reply@research.example>';
  const ok = await emailService.sendNotificationEmail({
    to: 'ada@example.edu', subject: 'Ada commented', heading: 'Ada commented on your post', ctaUrl: 'https://x.test/post/1',
    unsubscribeUrl: 'https://x.test/unsubscribe?token=t', oneClickUrl: 'https://x.test/api/v1/notifications/unsubscribe?token=t'
  });
  expect(ok).toBe(true);
  expect(calls).toHaveLength(1);
  const [c] = calls;
  expect(c.url).toBe('https://api.resend.com/emails');
  expect(c.init.headers.Authorization).toBe('Bearer re_test_key');
  expect(c.body).toMatchObject({ from: 'ResearchReel <no-reply@research.example>', to: ['ada@example.edu'], subject: 'Ada commented' });
  expect(c.body.html).toContain('Ada commented on your post');
  expect(c.body.text).toContain('Unsubscribe: https://x.test/unsubscribe?token=t');
  expect(c.body.headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  expect(emailService.isEmailConfigured()).toBe(true);
});

test("uses Resend's test sender until EMAIL_FROM is set", async () => {
  await emailService.sendNotificationEmail({ to: 'me@example.com', subject: 'Hi', heading: 'Hi' });
  expect(calls[0].body.from).toBe('ResearchReel <onboarding@resend.dev>');
});

test('a rejected send returns false instead of throwing', async () => {
  global.fetch = jest.fn(async () => new Response(JSON.stringify({ name: 'validation_error', message: 'The domain is not verified.' }), { status: 403 }));
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await expect(emailService.sendNotificationEmail({ to: 'x@example.com', subject: 'Hi', heading: 'Hi' })).resolves.toBe(false);
  spy.mockRestore();
});
