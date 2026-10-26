import { expect, test } from '@playwright/test';
import { setVerification, signUpViaApi, waitForEmail } from './helpers';

test('a scholar hosts a lecture; a student registers, asks, and the host answers', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const host = await hostCtx.newPage();
  const hostUser = await signUpViaApi(host, { name: 'Dr Host E2E' });
  await setVerification(hostUser.id, 'scholar');

  await host.goto('/lectures');
  await host.getByRole('link', { name: 'Host a lecture' }).click();
  const title = `Quantum repeaters ${Date.now().toString(36)}`;
  await host.getByLabel('Title').fill(title);
  await host.getByLabel(/Description/).fill('Why entanglement swapping matters for long-distance networks.');
  await host.getByLabel('Topic').fill('Physics');
  await host.getByLabel(/Join link/).fill('https://meet.example.org/repeaters');
  await host.getByLabel(/Seats/).fill('50');
  await host.getByRole('button', { name: 'Schedule lecture' }).click();
  await expect(host).toHaveURL(/\/lectures\/[0-9a-f-]{36}$/);
  const lectureUrl = host.url();

  // Visitors see the lecture but not the join link, and the page has a share preview.
  const anon = await (await browser.newContext()).newPage();
  const html = await (await anon.request.get(lectureUrl)).text();
  expect(html).toContain(`<meta property="og:title" content="${title}"`);
  expect(html).toMatch(/og:image" content="[^"]+opengraph-image/);
  await anon.goto(lectureUrl);
  await expect(anon.getByRole('heading', { name: title })).toBeVisible();
  await expect(anon.getByText('meet.example.org')).toHaveCount(0);

  const stuCtx = await browser.newContext();
  const student = await stuCtx.newPage();
  await signUpViaApi(student, { name: 'Student E2E' });
  await student.goto(lectureUrl);
  await student.getByRole('button', { name: 'Register' }).click();
  await expect(student.getByRole('button', { name: /Registered/ })).toBeVisible();
  await expect(student.getByRole('button', { name: 'Add to calendar' })).toBeVisible();
  await student.getByLabel('Your question').fill('How far can a single repeater link reach today?');
  await student.getByRole('button', { name: 'Send question' }).click();
  await expect(student.getByText('How far can a single repeater link reach today?')).toBeVisible();

  // The host is emailed about the question (lecture activity is on by default).
  const mail = await waitForEmail(host.request, hostUser.email, /New question/i);
  expect(mail.html).toContain('How far can a single repeater link reach today?');

  await host.reload();
  await expect(host.getByText('Attendees (1)')).toBeVisible();
  await host.getByRole('button', { name: 'Mark answered' }).click();
  await expect(host.getByText('Answered', { exact: true })).toBeVisible();
  await student.reload();
  await expect(student.getByText('Answered', { exact: true })).toBeVisible();
});
