import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { Client } from 'pg';

export const API = (process.env.E2E_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const MAILPIT = (process.env.MAILPIT_URL || 'http://localhost:8025').replace(/\/$/, '');
export const PASSWORD = 'E2e-Password-123';

export const unique = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

type MailSummary = { ID: string; Subject: string; Created: string };

/** Waits for the newest email to `to` whose subject matches, and returns its text and HTML. */
export async function waitForEmail(request: APIRequestContext, to: string, subject: RegExp, after = 0) {
  let found: MailSummary | undefined;
  await expect
    .poll(async () => {
      const res = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"` } });
      const body = (await res.json()) as { messages: MailSummary[] };
      found = body.messages.find((m) => subject.test(m.Subject) && new Date(m.Created).getTime() >= after);
      return Boolean(found);
    }, { timeout: 30_000, message: `email to ${to} matching ${subject}` })
    .toBe(true);
  const msg = await (await request.get(`${MAILPIT}/api/v1/message/${found!.ID}`)).json();
  const headers = (await (await request.get(`${MAILPIT}/api/v1/message/${found!.ID}/headers`)).json()) as Record<string, string[]>;
  return { subject: found!.Subject, text: msg.Text as string, html: msg.HTML as string, headers };
}

export const codeFrom = (text: string) => {
  const m = text.match(/\b(\d{6})\b/);
  if (!m) throw new Error(`no code in email: ${text.slice(0, 200)}`);
  return m[1];
};

/** Fills the 6 code boxes (the first box accepts a pasted code). */
export async function enterCode(page: Page, code: string) {
  await page.getByLabel('Digit 1').fill(code);
}

/** Creates and verifies an account through the API; the page's cookies hold the session. */
export async function signUpViaApi(page: Page, opts: { name?: string } = {}) {
  const id = unique('e2e');
  const email = `${id}@example.edu`;
  const username = id.slice(0, 30);
  const started = Date.now() - 1000;
  const reg = await page.request.post(`${API}/auth/register`, {
    data: { email, username, password: PASSWORD, full_name: opts.name || `E2E ${id.slice(-4)}` },
  });
  expect(reg.status(), await reg.text()).toBe(201);
  const mail = await waitForEmail(page.request, email, /verification code/i, started);
  const verify = await page.request.post(`${API}/auth/verify-otp`, { data: { email, otp: codeFrom(mail.text) } });
  expect(verify.status()).toBe(200);
  const body = await verify.json();
  return { email, username, id: body.data.user.id as string };
}

/** Grants a verification badge directly in the database (stands in for ORCID). */
export async function setVerification(userId: string, status: 'scholar' | 'faculty' | 'student') {
  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/researchreel' });
  await client.connect();
  try {
    await client.query('UPDATE users SET verification_status = $1 WHERE id = $2', [status, userId]);
  } finally {
    await client.end();
  }
}
