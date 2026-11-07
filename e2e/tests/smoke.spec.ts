import { expect, test } from '@playwright/test';
import { API, signUpViaApi } from './helpers';

const PAGES = ['/home', '/explore', '/library', '/projects', '/lectures', '/messages', '/notifications', '/settings', '/support'];

test('main pages load without errors or sideways scrolling', async ({ page }) => {
  await signUpViaApi(page);
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(`page error: ${e.message}`));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) failures.push(`${r.status()} ${r.url()}`);
  });
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(2);
  }
  expect(failures).toEqual([]);
});
