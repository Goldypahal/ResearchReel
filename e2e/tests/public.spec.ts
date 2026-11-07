import { expect, test } from '@playwright/test';
import { createPost, signUpViaApi, watchErrors } from './helpers';

test('signed-out visitors can open shared posts and profiles, which carry link previews', async ({ browser, request }) => {
  const ctx = await browser.newContext();
  const author = await signUpViaApi(ctx, 'Sharon Sharer');
  const postId = await createPost(ctx, 'Sharing a preprint on coral reef resilience #ecology');
  await ctx.close();

  const visitor = await (await browser.newContext()).newPage();
  const errors = watchErrors(visitor);
  await visitor.goto(`/post/${postId}`);
  await expect(visitor.locator('main').getByText('Sharing a preprint on coral reef resilience')).toBeVisible();
  expect(new URL(visitor.url()).pathname).toBe(`/post/${postId}`);
  await visitor.goto(`/profile/${author.username}`);
  await expect(visitor.getByRole('heading', { name: `@${author.username}` })).toBeVisible();
  for (const path of ['/explore', '/reels', '/lectures', '/support']) {
    await visitor.goto(path);
    expect(new URL(visitor.url()).pathname).toBe(path);
  }
  // Private areas still ask you to sign in.
  await visitor.goto('/messages');
  await visitor.waitForURL('**/auth/login**');
  expect(errors).toEqual([]);

  const html = await (await request.get(`/post/${postId}`)).text();
  expect(html).toMatch(/<meta property="og:title" content="Sharon Sharer: Sharing a preprint/);
  expect(html).toMatch(/<meta property="og:image" content="[^"]+\/opengraph-image/);
  const image = await request.get(html.match(/<meta property="og:image" content="([^"]+)"/)![1].replace(/^https?:\/\/[^/]+/, ''));
  expect(image.headers()['content-type']).toBe('image/png');

  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toMatch(/Disallow: \/messages/);
  expect((await request.get('/sitemap.xml')).status()).toBe(200);
});
