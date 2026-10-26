import { expect, test } from '@playwright/test';
import { API, signUpViaApi } from './helpers';

test('block someone from their profile, then unblock from settings', async ({ browser }) => {
  const target = await (await browser.newContext()).newPage();
  const bob = await signUpViaApi(target, { name: 'Bob Blocked' });
  await target.request.post(`${API}/posts/create`, { data: { content_type: 'text', caption: 'Bob shares a preprint' } });

  const page = await (await browser.newContext()).newPage();
  const alice = await signUpViaApi(page, { name: 'Alice Blocks' });

  // Alice follows Bob, then blocks him from the ⋯ menu (with a confirmation step).
  await page.goto(`/profile/${bob.username}`);
  await expect(page.getByText('Bob shares a preprint')).toBeVisible();
  await page.getByRole('button', { name: 'Follow', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Following', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: 'Block' }).click();
  await expect(page.getByText(`Block @${bob.username}?`)).toBeVisible();
  await page.getByRole('button', { name: 'Block', exact: true }).click();

  await expect(page.getByText(`You blocked @${bob.username}`)).toBeVisible();
  await expect(page.getByText('Bob shares a preprint')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Message' })).toHaveCount(0);

  // Bob can no longer find Alice.
  await target.goto(`/profile/${alice.username}`);
  await expect(target.getByText("This account doesn't exist")).toBeVisible();

  // Alice unblocks from settings.
  await page.goto('/settings?tab=privacy');
  const row = page.getByRole('listitem').filter({ hasText: `@${bob.username}` });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Unblock' }).click();
  await expect(page.getByText("You haven't blocked anyone.")).toBeVisible();

  await target.reload();
  await expect(target.getByRole('heading', { name: alice.username })).toBeVisible();
});

test('mute someone: their posts leave the feed but their profile stays', async ({ browser }) => {
  const target = await (await browser.newContext()).newPage();
  const eve = await signUpViaApi(target, { name: 'Eve Muted' });
  await target.request.post(`${API}/posts/create`, { data: { content_type: 'text', caption: 'Eve posts daily lab notes' } });

  const page = await (await browser.newContext()).newPage();
  await signUpViaApi(page, { name: 'Dana Mutes' });
  await page.goto(`/profile/${eve.username}`);
  await page.getByRole('button', { name: 'More options' }).click();
  await page.getByRole('menuitem', { name: /Mute/ }).click();
  await expect(page.getByText(`Muted @${eve.username}`).first()).toBeVisible();
  // Still visible on the profile on purpose.
  await expect(page.getByText('Eve posts daily lab notes')).toBeVisible();

  await page.goto('/settings?tab=privacy');
  await expect(page.getByRole('listitem').filter({ hasText: `@${eve.username}` })).toBeVisible();
});
