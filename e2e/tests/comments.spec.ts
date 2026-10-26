import { expect, test } from '@playwright/test';
import { API, signUpViaApi, waitForEmail } from './helpers';

test('threaded discussion: reply, @mention autocomplete, like, edit, delete', async ({ browser }) => {
  const authorPage = await (await browser.newContext()).newPage();
  const author = await signUpViaApi(authorPage, { name: 'Thread Author' });
  const post = await authorPage.request.post(`${API}/posts/create`, { data: { content_type: 'text', caption: 'Thread test: single-photon sources' } });
  const postId = (await post.json()).data.id as string;

  // Alice asks a question.
  const alice = await (await browser.newContext()).newPage();
  const aliceUser = await signUpViaApi(alice, { name: 'Alice Asks' });
  await alice.goto(`/post/${postId}`);
  await alice.getByLabel('Write a comment').fill('What brightness do you get at the fibre?');
  await alice.getByLabel('Write a comment').press('Enter');
  await expect(alice.getByText('What brightness do you get at the fibre?')).toBeVisible();

  // Bob replies and mentions the author using autocomplete.
  const bob = await (await browser.newContext()).newPage();
  await signUpViaApi(bob, { name: 'Bob Replies' });
  await bob.goto(`/post/${postId}`);
  await bob.getByRole('button', { name: 'Reply' }).first().click();
  const reply = bob.getByLabel('Write a reply');
  await reply.pressSequentially(`Same question, cc @${author.username.slice(0, -2)}`);
  await bob.getByRole('option').filter({ hasText: `@${author.username}` }).click();
  await expect(reply).toHaveValue(`Same question, cc @${author.username} `);
  await reply.press('Enter');
  await expect(bob.getByRole('link', { name: `@${author.username}`, exact: true })).toBeVisible();

  // Alice sees "View 1 reply", likes Bob's reply, and is emailed about the reply.
  await alice.reload();
  await alice.getByRole('button', { name: 'View 1 reply' }).click();
  await expect(alice.getByText('Same question, cc')).toBeVisible();
  await alice.getByRole('button', { name: 'Like comment' }).nth(1).click();
  await expect(alice.getByRole('button', { name: 'Unlike comment' })).toBeVisible();
  const replyMail = await waitForEmail(alice.request, aliceUser.email, /replied to you/);
  expect(replyMail.html).toContain('Same question');

  // The author gets a mention (not a separate reply/comment email for the same message).
  const mention = await waitForEmail(authorPage.request, author.email, /mentioned you/);
  expect(mention.html).toContain('Same question');

  // Alice edits her comment.
  await alice.getByRole('button', { name: 'Comment options' }).first().click();
  await alice.getByRole('button', { name: 'Edit' }).click();
  await alice.getByLabel('Edit comment').fill('What brightness do you get at the first lens?');
  await alice.getByRole('button', { name: 'Save comment' }).click();
  await expect(alice.getByText('What brightness do you get at the first lens?')).toBeVisible();
  await expect(alice.getByText(/· edited/)).toBeVisible();

  // Deleting it keeps the thread, showing a placeholder.
  alice.once('dialog', (d) => d.accept());
  await alice.getByRole('button', { name: 'Comment options' }).first().click();
  await alice.getByRole('button', { name: 'Delete' }).click();
  await expect(alice.getByText('Comment deleted')).toBeVisible();
  await bob.reload();
  await expect(bob.getByText('Comment deleted')).toBeVisible();
  await bob.getByRole('button', { name: 'View 1 reply' }).click();
  await expect(bob.getByText('Same question, cc')).toBeVisible();
});
