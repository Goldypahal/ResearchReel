import { expect, test } from '@playwright/test';
import { signUpViaApi } from './helpers';

test('host schedules a lecture, an attendee registers and downloads a calendar file, then the host cancels', async ({ browser }) => {
  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();
  await signUpViaApi(hostCtx, 'Hana Host');
  const guest = await signUpViaApi(guestCtx, 'Gus Guest');

  const h = await hostCtx.newPage();
  await h.goto('/lectures/host');
  await h.fill('input[placeholder=Title]', 'Intro to Bayesian Statistics');
  const start = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const local = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  await h.getByLabel('Start time').fill(local);
  await h.getByRole('button', { name: 'Schedule lecture' }).click();
  await h.waitForURL(/\/lectures\/[0-9a-f-]{36}$/);
  const lectureUrl = new URL(h.url()).pathname;

  const g = await guestCtx.newPage();
  await g.goto(lectureUrl);
  await g.getByRole('button', { name: 'Register' }).click();
  await expect(g.getByText(/You.re registered/)).toBeVisible();
  const [download] = await Promise.all([g.waitForEvent('download'), g.getByRole('link', { name: 'Add to calendar' }).click()]);
  const fs = await import('fs');
  expect(fs.readFileSync(await download.path(), 'utf8')).toMatch(/BEGIN:VEVENT[\s\S]*SUMMARY:Intro to Bayesian Statistics/);

  await h.reload();
  await h.getByRole('button', { name: 'Cancel lecture' }).click();
  await h.getByRole('dialog').getByRole('button', { name: /Delete|Cancel lecture/ }).last().click();
  await h.waitForURL('**/lectures');
  await g.goto('/notifications');
  await expect(g.getByText(/cancelled the lecture/)).toBeVisible();
  expect(guest.username).toBeTruthy();
  await hostCtx.close();
  await guestCtx.close();
});
