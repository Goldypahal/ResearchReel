import { expect, test } from '@playwright/test';
import { API, signUpViaApi, waitForEmail } from './helpers';

test('comment email arrives with a working unsubscribe link', async ({ browser }) => {
  const authorPage = await (await browser.newContext()).newPage();
  const author = await signUpViaApi(authorPage, { name: 'Author E2E' });
  const post = await authorPage.request.post(`${API}/posts/create`, { data: { content_type: 'text', caption: 'E2E post about photonic qubits' } });
  const postId = (await post.json()).data.id as string;

  const reader = await (await browser.newContext()).newPage();
  await signUpViaApi(reader, { name: 'Reader E2E' });
  await reader.goto(`/post/${postId}`);
  await reader.getByPlaceholder('Add to the discussion…').first().fill('Lovely result — which detectors?');
  await reader.keyboard.press('Enter');
  await expect(reader.getByText('Lovely result — which detectors?')).toBeVisible();

  const mail = await waitForEmail(authorPage.request, author.email, /commented on your post/);
  expect(mail.html).toContain('Lovely result');
  expect(mail.headers['List-Unsubscribe']?.[0]).toMatch(/^<https?:\/\/.+\/api\/v1\/notifications\/unsubscribe\?token=.+>$/);
  expect(mail.headers['List-Unsubscribe-Post']?.[0]).toBe('List-Unsubscribe=One-Click');
  const link = mail.text.match(/Unsubscribe: (\S+)/)?.[1];
  expect(link).toBeTruthy();

  // Following the link doesn't unsubscribe by itself; it needs a click.
  const unsub = await (await browser.newContext()).newPage();
  await unsub.goto(link!.replace(/^https?:\/\/[^/]+/, ''));
  await expect(unsub.getByRole('heading', { name: 'Unsubscribe from these emails?' })).toBeVisible();
  await unsub.getByRole('button', { name: 'Unsubscribe' }).click();
  await expect(unsub.getByRole('heading', { name: "You're unsubscribed" })).toBeVisible();

  await authorPage.goto('/settings?tab=notifications');
  await expect(authorPage.getByRole('switch', { name: 'Comments on your posts' })).toHaveAttribute('aria-checked', 'false');
  await expect(authorPage.getByRole('switch', { name: 'New followers' })).toHaveAttribute('aria-checked', 'true');
});
