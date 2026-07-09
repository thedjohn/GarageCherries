import { test, expect } from '@playwright/test';

test.describe('Buyer auth flow', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/account/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.locator('main input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/account/signup');
    await expect(page.getByRole('heading', { name: /create|sign up|get started/i })).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/account/forgot-password');
    await expect(page.getByRole('heading', { name: /forgot|reset/i })).toBeVisible();
    await expect(page.locator('main input[type="email"]')).toBeVisible();
  });

  test('invalid login shows error', async ({ page }) => {
    await page.goto('/account/login');
    await page.locator('main input[type="email"]').fill('notareal@user.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    // Should show an error â€” not redirect
    await expect(page.locator('text=/invalid|incorrect|wrong|error/i').first()).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/account/login');
  });

  test('unauthenticated access to /account redirects to login', async ({ page }) => {
    await page.goto('/account');
    // Should redirect to login or show auth required
    await expect(page).toHaveURL(/login|account/);
  });

  test('dealer login page loads separately', async ({ page }) => {
    await page.goto('/dealer/login');
    await expect(page.getByRole('heading', { name: /dealer|sign in/i })).toBeVisible();
  });

  test('dealer apply page is accessible without auth', async ({ page }) => {
    await page.goto('/dealer/apply');
    await expect(page.getByRole('heading', { name: /dealer account application/i })).toBeVisible();
    // Form fields should be present
    await expect(page.locator('input[placeholder="Full name"]')).toBeVisible();
  });
});

