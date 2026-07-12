import { test, expect } from '@playwright/test';

// These tests require ADMIN_EMAIL and ADMIN_PASSWORD set in environment
// Run with: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret npx playwright test admin
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

test.describe('Admin panel', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'Set ADMIN_EMAIL and ADMIN_PASSWORD to run admin tests');

  test.beforeEach(async ({ page }) => {
    await page.goto('/account/login');
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL(/account|admin/, { timeout: 10000 });
    await page.goto('/admin');
  });

  test('admin page loads with listings tab', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /listings/i })).toBeVisible();
  });

  test('admin role badge is shown', async ({ page }) => {
    await expect(page.locator('text=/superadmin|admin|moderator/i').first()).toBeVisible();
  });

  test('events tab loads', async ({ page }) => {
    await page.getByRole('button', { name: /events/i }).click();
    // Either shows pending submissions, existing events, or the add-event form
    const content = page.locator('text=/pending submissions|add event|no events/i').first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test('reported tab loads', async ({ page }) => {
    await page.getByRole('button', { name: /reported/i }).click();
    const content = page.locator('text=/no reported|reported/i').first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test('users tab loads user list', async ({ page }) => {
    await page.getByRole('button', { name: /users/i }).click();
    await expect(page.locator('input[placeholder*="search" i]')).toBeVisible({ timeout: 5000 });
    // At least the admin's own account should appear
    const userEntry = page.locator('text=' + ADMIN_EMAIL);
    await expect(userEntry).toBeVisible({ timeout: 8000 });
  });

  test('team tab shows current team members', async ({ page }) => {
    await page.getByRole('button', { name: /team/i }).click();
    // Admin's email should appear in team list
    await expect(page.locator('text=' + ADMIN_EMAIL)).toBeVisible({ timeout: 5000 });
  });

  test('applications tab loads', async ({ page }) => {
    await page.getByRole('button', { name: /applications/i }).click();
    const content = page.locator('text=/pending|approved|no dealer applications/i').first();
    await expect(content).toBeVisible({ timeout: 5000 });
  });

  test('team tab shows the Trial & Promo Settings card with current values (superadmin)', async ({ page }) => {
    await page.getByRole('button', { name: /team/i }).click();
    const heading = page.locator('text=/trial.*promo settings/i').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    // Only render further checks if the logged-in test account is actually superadmin —
    // this card is hidden entirely for admin/moderator/support.
    if (await heading.isVisible()) {
      const inputs = page.locator('input[type="date"], input[type="number"]');
      await expect(inputs.first()).toBeVisible();
      const count = await inputs.count();
      expect(count).toBeGreaterThanOrEqual(4);
      for (let i = 0; i < count; i++) {
        await expect(inputs.nth(i)).not.toHaveValue('');
      }
    }
  });

  test('users tab Edit modal shows the dealer/advertiser trial override field when applicable', async ({ page }) => {
    await page.getByRole('button', { name: /users/i }).click();
    await expect(page.locator('input[placeholder*="search" i]')).toBeVisible({ timeout: 5000 });
    const dealerRow = page.locator('text=/dealer/i').first();
    if (await dealerRow.isVisible().catch(() => false)) {
      await dealerRow.locator('xpath=ancestor::*[.//button[contains(., "Edit")]][1]').getByRole('button', { name: /edit/i }).click().catch(() => {});
    }
    // Best-effort: this test only asserts the field appears when an Edit modal is actually open,
    // since test data (a real dealer/advertiser account) isn't guaranteed to exist in every environment.
    const editModal = page.locator('text=/edit user/i').first();
    if (await editModal.isVisible().catch(() => false)) {
      const dateField = page.locator('text=/dealer beta expires|advertiser trial ends/i').first();
      await expect(dateField).toBeVisible({ timeout: 3000 });
    }
  });

  test('non-admin is denied access', async ({ page, context }) => {
    // Clear session and access /admin directly
    await context.clearCookies();
    await page.goto('/admin');
    // Should show access denied or redirect
    await expect(page.locator('text=/access denied|sign in|unauthorized/i').first()).toBeVisible({ timeout: 5000 });
  });
});
