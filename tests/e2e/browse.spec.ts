import { test, expect } from '@playwright/test';

test.describe('Browse listings (public)', () => {
  test('homepage loads with hero and listings', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GarageCherries/i);
    // Hero CTA is present
    await expect(page.getByRole('link', { name: /browse/i }).first()).toBeVisible();
  });

  test('listings page loads and shows cars', async ({ page }) => {
    await page.goto('/listings');
    await expect(page.getByRole('heading', { name: /all cars|search results/i })).toBeVisible();
    // At least one car card should be present
    const cards = page.locator('a[href*="/listings/"]');
    await expect(cards.first()).toBeVisible();
  });

  test('filter by make narrows results', async ({ page }) => {
    await page.goto('/listings');
    // Use the make filter
    const makeSelect = page.locator('select[name="make"], select').first();
    await makeSelect.selectOption('Chevrolet');
    await page.getByRole('button', { name: /apply filters/i }).click();
    await page.waitForURL(/make=Chevrolet/, { timeout: 10000 });
    const heading = page.getByRole('heading', { name: /search results/i });
    await expect(heading).toBeVisible();
  });

  test('listing detail page loads', async ({ page }) => {
    await page.goto('/listings');
    const firstCard = page.locator('a[href*="/listings/"]').first();
    const href = await firstCard.getAttribute('href');
    expect(href).toBeTruthy();
    await firstCard.click();
    // Should show price and contact form
    await expect(page.locator('text=/\\$[0-9]/').first()).toBeVisible();
  });

  test('404 page shows for unknown listing', async ({ page }) => {
    await page.goto('/listings/dodge/charger/does-not-exist/fake-slug');
    await expect(page.getByText(/not found|doesn't exist/i).first()).toBeVisible();
  });

  test('dealers directory loads', async ({ page }) => {
    await page.goto('/dealers');
    await expect(page.getByRole('heading', { name: /dealers/i })).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /pricing/i })).toBeVisible();
  });

  test('guides page loads', async ({ page }) => {
    await page.goto('/guides');
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
