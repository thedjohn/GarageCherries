import { test, expect } from '@playwright/test';

// Uses the dealer apply page as a stable, always-present URL that doesn't
// need a real listing slug. For listing detail we navigate from the listings
// page so we get a real slug dynamically.
test.describe('Listing detail page', () => {
  test('can navigate to a listing from the listings page', async ({ page }) => {
    await page.goto('/listings');

    // Click the first listing card link
    const firstCard = page.getByRole('link').filter({ hasText: /\$|Call for price/i }).first();
    if (await firstCard.count() === 0) {
      // No listings in DB — skip gracefully
      test.skip();
      return;
    }
    await firstCard.click();
    await expect(page).toHaveURL(/\/listings\/.+\/.+\/.+/);
  });

  test('listing detail page shows expected sections', async ({ page }) => {
    await page.goto('/listings');
    const cards = page.locator('a[href*="/listings/"]');
    const count = await cards.count();
    if (count === 0) { test.skip(); return; }

    await cards.first().click();
    await page.waitForLoadState('networkidle');

    // Price or "Call for price"
    await expect(page.getByText(/\$[\d,]+|Call for price/i).first()).toBeVisible();

    // Contact / message button
    await expect(
      page.getByRole('button', { name: /message|contact|inquire/i }).first()
    ).toBeVisible();
  });

  test('listing detail page has no application errors', async ({ page }) => {
    await page.goto('/listings');
    const cards = page.locator('a[href*="/listings/"]');
    if (await cards.count() === 0) { test.skip(); return; }

    await cards.first().click();
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});

test.describe('Dealer apply page', () => {
  test('renders the application form', async ({ page }) => {
    await page.goto('/dealer/apply');
    await expect(page.getByRole('heading', { name: /dealer account application/i })).toBeVisible();
    await expect(page.getByPlaceholder('Dealership name')).toBeVisible();
  });

  test('form has required fields', async ({ page }) => {
    await page.goto('/dealer/apply');
    await expect(page.getByPlaceholder('Full name')).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
  });
});
