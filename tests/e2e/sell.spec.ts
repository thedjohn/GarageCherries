import { test, expect } from '@playwright/test';

// /sell is auth-gated — logged-out visitors see SellGate (sign-in prompt), not the form.
// These tests verify the gate and public-facing behaviour only.
// Form internals are tested in unit tests (lib/data, validation).

test.describe('Sell page (auth-gated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sell');
  });

  test('page loads without application error', async ({ page }) => {
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('logged-out visitor sees sign-in prompt, not the listing form', async ({ page }) => {
    // SellGate heading
    await expect(
      page.getByRole('heading', { name: /ready to sell|sign in|create.*account|list your car/i }).first()
    ).toBeVisible({ timeout: 8000 });
    // The actual listing form should NOT be present
    await expect(page.locator('input[name="year"]')).not.toBeVisible();
  });

  test('has a link to sign in or create account', async ({ page }) => {
    const cta = page.getByRole('link', { name: /sign in|create.*account|log in/i }).first();
    await expect(cta).toBeVisible();
  });
});
