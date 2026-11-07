import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against an already running stack:
 *   E2E_BASE_URL  web app            (default http://localhost:3000)
 *   E2E_API_URL   API base           (default http://localhost:5000/api/v1)
 *   MAILPIT_URL   Mailpit web/API    (default http://localhost:8025)
 *   DATABASE_URL  used only to grant a test host the scholar badge
 */
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /smoke\.spec\.ts/ },
  ],
});
