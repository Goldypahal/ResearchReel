import { expect, test } from '@playwright/test';
import { PASSWORD, codeFrom, enterCode, unique, waitForEmail } from './helpers';

test('sign up, confirm the emailed code, and land on home', async ({ page }) => {
  const id = unique('signup');
  const email = `${id}@example.edu`;
  const started = Date.now() - 1000;

  await page.goto('/auth/register');
  await page.getByLabel('Full name').fill('Rosalind Test');
  await page.getByLabel('Email').fill(email);
  await expect(page.getByLabel('Username')).toHaveValue(id); // suggested from the email
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await enterCode(page, '000000');
  await expect(page.getByRole('alert').filter({ hasText: 'incorrect' })).toBeVisible();

  const mail = await waitForEmail(page.request, email, /verification code/i, started);
  await enterCode(page, codeFrom(mail.text));
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: /Rosalind Test/ })).toBeVisible();
});

test('reset a forgotten password from the emailed code', async ({ page }) => {
  const id = unique('reset');
  const email = `${id}@example.edu`;
  const t0 = Date.now() - 1000;
  await page.request.post(`${process.env.E2E_API_URL || 'http://localhost:5000/api/v1'}/auth/register`, {
    data: { email, username: id, password: PASSWORD, full_name: 'Reset Me' },
  });
  const verifyMail = await waitForEmail(page.request, email, /verification code/i, t0);
  await page.request.post(`${process.env.E2E_API_URL || 'http://localhost:5000/api/v1'}/auth/verify-otp`, { data: { email, otp: codeFrom(verifyMail.text) } });
  await page.context().clearCookies();

  const t1 = Date.now() - 1000;
  await page.goto(`/auth/forget-password?email=${encodeURIComponent(email)}`);
  await page.getByRole('button', { name: 'Send reset code' }).click();
  const mail = await waitForEmail(page.request, email, /reset your/i, t1);

  await page.getByLabel('Reset code').fill(codeFrom(mail.text));
  await page.getByLabel('New password', { exact: true }).fill('Brand-New-Pass-9');
  await page.getByLabel('Confirm new password').fill('Brand-New-Pass-9');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('heading', { name: 'Password updated' })).toBeVisible();

  await page.getByRole('link', { name: 'Go to sign in' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /invalid credentials/i })).toBeVisible();

  await page.getByLabel('Password').fill('Brand-New-Pass-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test('signed-out visitors can browse public pages but not account pages', async ({ page }) => {
  await page.goto('/lectures');
  await expect(page.getByRole('heading', { name: 'Lectures' })).toBeVisible();
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fsettings/);
});
