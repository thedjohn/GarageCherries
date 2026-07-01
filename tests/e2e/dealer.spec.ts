import { test, expect } from '@playwright/test';

const DEALER_EMAIL = process.env.DEALER_EMAIL ?? '';
const DEALER_PASSWORD = process.env.DEALER_PASSWORD ?? '';

test.describe('Dealer portal', () => {
  test('dealer login page loads', async ({ page }) => {
    await page.goto('/dealer/login');
    await expect(page.getByRole('heading', { name: /sign in to your account/i })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('unauthenticated access to dealer dashboard redirects to login', async ({ page }) => {
    await page.goto('/dealer/dashboard');
    await expect(page).toHaveURL(/dealer\/login/);
  });

  test('dealer apply page is public', async ({ page }) => {
    await page.goto('/dealer/apply');
    await expect(page.getByRole('heading', { name: /apply|dealer account/i })).toBeVisible();
  });

  test('dealer apply form has all required fields', async ({ page }) => {
    await page.goto('/dealer/apply');
    await expect(page.locator('input[placeholder="Full name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();
  });

  test.describe('authenticated dealer', () => {
    test.skip(!DEALER_EMAIL || !DEALER_PASSWORD, 'Set DEALER_EMAIL and DEALER_PASSWORD to run');

    test.beforeEach(async ({ page }) => {
      await page.goto('/dealer/login');
      await page.locator('input[type="email"]').fill(DEALER_EMAIL);
      await page.locator('input[type="password"]').fill(DEALER_PASSWORD);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL(/dealer\/dashboard/, { timeout: 10000 });
    });

    test('dashboard loads with tabs', async ({ page }) => {
      await expect(page.getByRole('button', { name: /overview/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /inventory/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /inquiries/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
    });

    test('overview tab shows metric cards', async ({ page }) => {
      await page.getByRole('button', { name: /overview/i }).click();
      // Should show stat cards even if values are 0
      await expect(page.locator('text=/active listing|view|inquir/i').first()).toBeVisible({ timeout: 5000 });
    });

    test('inventory tab shows add vehicle button', async ({ page }) => {
      await page.getByRole('button', { name: /inventory/i }).click();
      await expect(page.getByRole('button', { name: /add vehicle/i })).toBeVisible();
    });

    test('add vehicle modal opens', async ({ page }) => {
      await page.getByRole('button', { name: /inventory/i }).click();
      await page.getByRole('button', { name: /add vehicle/i }).click();
      await expect(page.getByRole('heading', { name: /add vehicle/i })).toBeVisible();
    });

    test('settings tab shows profile form', async ({ page }) => {
      await page.getByRole('button', { name: /settings/i }).click();
      await expect(page.getByLabel(/phone/i)).toBeVisible();
    });

    test('logout button works', async ({ page }) => {
      await page.getByRole('button', { name: /log out|sign out/i }).click();
      await expect(page).toHaveURL(/dealer\/login/);
    });
  });
});
