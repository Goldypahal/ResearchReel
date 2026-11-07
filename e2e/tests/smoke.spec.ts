import { expect, test } from '@playwright/test';
import { signUpViaApi, watchErrors } from './helpers';

const PAGES = ['/home', '/explore', '/discover', '/reels', '/library', '/ai', '/ai/ask', '/ai/research', '/messages', '/notifications',
  '/saved', '/search?q=research', '/projects', '/workspace', '/lectures', '/leaderboard', '/achievements', '/settings', '/support', '/create'];

test('every main page loads without errors or horizontal overflow', async ({ page, context }) => {
  const me = await signUpViaApi(context, 'Sam Smoke');
  const errors = watchErrors(page);
  for (const path of [...PAGES, `/profile/${me.username}`]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).not.toContainText(/Application error|Unhandled Runtime Error/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});
