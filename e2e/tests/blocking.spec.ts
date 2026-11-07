import { expect, test } from '@playwright/test';
import { createPost, signUpViaApi } from './helpers';

test('blocking hides both accounts from each other, and Settings can undo it', async ({ browser }) => {
  const aCtx = await browser.newContext();
  const bCtx = await browser.newContext();
  const alice = await signUpViaApi(aCtx, 'Alice Blocker');
  const bob = await signUpViaApi(bCtx, 'Bob Blocked');
  const bobPost = await createPost(bCtx, 'A post Alice should not see');

  const a = await aCtx.newPage();
  await a.goto(`/profile/${bob.username}`);
  await a.getByRole('button', { name: 'More options' }).click();
  await a.getByRole('menuitem', { name: /Block/ }).click();
  await a.getByRole('dialog').getByRole('button', { name: 'Block' }).click();
  await expect(a.getByText('You blocked this account.')).toBeVisible();

  // Bob can no longer find Alice; Alice can no longer open Bob's post.
  const b = await bCtx.newPage();
  await b.goto(`/profile/${alice.username}`);
  await expect(b.getByText(/not found/i).first()).toBeVisible();
  await a.goto(`/post/${bobPost}`);
  await expect(a.getByText(/not found/i).first()).toBeVisible();

  // Undo from Settings → Blocked & muted.
  await a.goto('/settings?tab=privacy');
  await expect(a.getByText(`@${bob.username}`)).toBeVisible();
  await a.getByRole('button', { name: 'Unblock' }).click();
  await expect(a.getByText('You haven’t blocked anyone.')).toBeVisible();
  await b.reload();
  await expect(b.getByRole('heading', { name: `@${alice.username}` })).toBeVisible();
  await aCtx.close();
  await bCtx.close();
});
