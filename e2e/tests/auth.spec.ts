import { expect, test } from '@playwright/test';
import { PASSWORD, codeFrom, unique, waitForEmail } from './helpers';

test('sign up with the emailed code, sign out, sign back in, reset the password', async ({ page }) => {
  const id = unique('auth');
  const email = `${id}@example.edu`;
  const started = Date.now() - 1000;

  await page.goto('/');
  await page.getByRole('button', { name: 'Create an account' }).click();
  await page.fill('#fullName', 'Ada Tester');
  await page.fill('#email', email);
  await page.fill('#username', id.slice(0, 30));
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  const mail = await waitForEmail(page.request, email, /verification code/i, started);
  await page.fill('#otp', '000000');
  await page.getByRole('button', { name: 'Verify email' }).click();
  await expect(page.getByText(/invalid|incorrect|wrong/i).first()).toBeVisible();
  await page.fill('#otp', codeFrom(mail.text));
  await page.getByRole('button', { name: 'Verify email' }).click();
  await page.waitForURL('**/home');

  // Sign out from the sidebar's More menu, then sign back in.
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.waitForURL((u) => u.pathname === '/' || u.pathname.startsWith('/auth'));
  await page.goto('/auth/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/home');

  // Forgot password: the reset link arrives by email and sets a new password.
  await page.context().clearCookies();
  const resetStarted = Date.now() - 1000;
  await page.goto('/auth/forget-password');
  await page.getByLabel(/email/i).fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  const reset = await waitForEmail(page.request, email, /reset/i, resetStarted);
  const link = reset.text.match(/https?:\/\/\S+token=\S+/)?.[0];
  expect(link).toBeTruthy();
  await page.goto(new URL(link!).pathname + new URL(link!).search);
  const fields = page.locator('input[type=password]');
  await fields.nth(0).fill('New-Password-456');
  await fields.nth(1).fill('New-Password-456');
  await page.getByRole('button', { name: 'Update password' }).click();
  await page.waitForURL('**/auth/login**');
  await page.fill('#email', email);
  await page.fill('#password', 'New-Password-456');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/home');
});
