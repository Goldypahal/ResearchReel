import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';

export const API = (process.env.E2E_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const MAILPIT = (process.env.MAILPIT_URL || 'http://localhost:8025').replace(/\/$/, '');
export const PASSWORD = 'E2e-Password-123';

export const unique = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

type MailSummary = { ID: string; Subject: string; Created: string };

/** Waits for the newest email to `to` whose subject matches, and returns its text and headers. */
export async function waitForEmail(request: APIRequestContext, to: string, subject: RegExp, after = 0) {
  let found: MailSummary | undefined;
  await expect.poll(async () => {
    const res = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"` } });
    const body = (await res.json()) as { messages: MailSummary[] };
    found = body.messages.find((m) => subject.test(m.Subject) && new Date(m.Created).getTime() >= after);
    return Boolean(found);
  }, { timeout: 30_000, message: `email to ${to} matching ${subject}` }).toBe(true);
  const msg = await (await request.get(`${MAILPIT}/api/v1/message/${found!.ID}`)).json();
  const headers = (await (await request.get(`${MAILPIT}/api/v1/message/${found!.ID}/headers`)).json()) as Record<string, string[]>;
  return { subject: found!.Subject, text: msg.Text as string, html: msg.HTML as string, headers };
}

export const codeFrom = (text: string) => {
  const m = text.match(/\b(\d{6})\b/);
  if (!m) throw new Error(`no code in email: ${text.slice(0, 200)}`);
  return m[1];
};

export type TestUser = { email: string; username: string; id: string; name: string };

/** Creates and verifies an account through the API (with the real email code); the context holds the session. */
export async function signUpViaApi(context: BrowserContext, name = 'E2E Tester'): Promise<TestUser> {
  const id = unique('e2e');
  const email = `${id}@example.edu`;
  const username = id.slice(0, 30);
  const started = Date.now() - 1000;
  const reg = await context.request.post(`${API}/auth/register`, { data: { email, username, password: PASSWORD, full_name: name } });
  expect(reg.status(), await reg.text()).toBe(201);
  const mail = await waitForEmail(context.request, email, /verification code/i, started);
  const verify = await context.request.post(`${API}/auth/verify-otp`, { data: { email, otp: codeFrom(mail.text) } });
  expect(verify.status()).toBe(200);
  return { email, username, id: (await verify.json()).data.user.id, name };
}

/** Collects console errors and failed API calls, ignoring the expected signed-out probe. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/401|Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`); });
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 500 || (r.status() >= 400 && u.includes('/api/') && !/\/users\/me|\/auth\/refresh/.test(u) && r.status() !== 401)) {
      errors.push(`${r.status()} ${r.request().method()} ${u}`);
    }
  });
  return errors;
}

/** Creates a text post through the API and returns its id. */
export async function createPost(context: BrowserContext, caption: string) {
  const r = await context.request.post(`${API}/posts/create`, { data: { content_type: 'text', caption } });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()).data.id as string;
}
