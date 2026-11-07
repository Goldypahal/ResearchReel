import { expect, test } from '@playwright/test';
import { createPost, signUpViaApi, waitForEmail, watchErrors } from './helpers';

test('threaded discussion with a reply, an @mention, a like, an edit, and email notifications', async ({ browser }) => {
  const authorCtx = await browser.newContext();
  const readerCtx = await browser.newContext();
  const author = await signUpViaApi(authorCtx, 'Paula Author');
  const reader = await signUpViaApi(readerCtx, 'Rita Reader');
  const postId = await createPost(authorCtx, 'Our new results on protein folding #biology');

  // Reader comments.
  const page = await readerCtx.newPage();
  const errors = watchErrors(page);
  const started = Date.now() - 1000;
  await page.goto(`/post/${postId}`);
  await page.getByRole('button', { name: 'Comments' }).click();
  await page.getByLabel('Write a comment').fill('How large was the training set?');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText('How large was the training set?')).toBeVisible();

  // The author gets an email with an unsubscribe link and one-click headers.
  const mail = await waitForEmail(page.request, author.email, /commented on your post/, started);
  expect(mail.text).toContain('How large was the training set?');
  expect(mail.headers['List-Unsubscribe']?.[0]).toMatch(/unsubscribe\?token=/);

  // The author replies, mentions the reader, and likes the comment.
  const a = await authorCtx.newPage();
  await a.goto(`/post/${postId}`);
  await a.getByRole('button', { name: 'Comments' }).click();
  await a.getByRole('button', { name: 'Like comment' }).first().click();
  await a.getByRole('button', { name: 'Reply', exact: true }).first().click();
  await a.getByLabel('Write a reply').fill(`About 50k structures, @${reader.username}`);
  await a.getByRole('button', { name: 'Post reply' }).click();
  await expect(a.getByText('About 50k structures,')).toBeVisible();
  await expect(a.getByText('Author', { exact: true }).first()).toBeVisible();

  // The reader is told once (mention), by email too.
  await waitForEmail(page.request, reader.email, /mentioned you/, started);

  // Reader sees the reply thread and edits their comment.
  await page.reload();
  await page.getByRole('button', { name: 'Comments' }).click();
  await page.getByRole('button', { name: /View 1 reply/ }).click();
  await expect(page.getByText('About 50k structures,')).toBeVisible();
  await page.getByRole('button', { name: 'Comment options' }).first().click();
  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Edit comment').fill('How large was the training set, exactly?');
  await page.getByRole('button', { name: 'Save comment' }).click();
  await expect(page.getByText('· edited')).toBeVisible();

  expect(errors).toEqual([]);
  await authorCtx.close();
  await readerCtx.close();
});

test('unsubscribing from an email link turns that category off', async ({ browser }) => {
  const ctx = await browser.newContext();
  const other = await browser.newContext();
  const me = await signUpViaApi(ctx, 'Una Subscriber');
  await signUpViaApi(other, 'Fred Follower');
  const started = Date.now() - 1000;
  await other.request.post(`${process.env.E2E_API_URL || 'http://localhost:5000/api/v1'}/users/${me.username}/follow`);
  const mail = await waitForEmail(ctx.request, me.email, /started following you/, started);
  const link = mail.text.match(/https?:\/\/\S+\/unsubscribe\?token=\S+/)?.[0];
  expect(link).toBeTruthy();

  const page = await (await browser.newContext()).newPage(); // signed out, as from a mail app
  await page.goto(new URL(link!).pathname + new URL(link!).search);
  await page.getByRole('button', { name: 'Unsubscribe' }).click();
  await expect(page.getByText(/You.re unsubscribed/)).toBeVisible();

  const s = await ctx.newPage();
  await s.goto('/settings?tab=notifications');
  await expect(s.getByRole('switch', { name: 'New followers' })).toHaveAttribute('aria-checked', 'false');
  await expect(s.getByRole('switch', { name: 'Comments, replies and mentions' })).toHaveAttribute('aria-checked', 'true');
  await ctx.close();
  await other.close();
});
