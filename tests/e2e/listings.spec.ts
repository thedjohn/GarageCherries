import { test, expect } from '@playwright/test';

test.describe('Listings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/listings');
  });

  test('page loads without error', async ({ page }) => {
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('shows the page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /all cars|search results/i })).toBeVisible();
  });

  test('filter sidebar is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /filter/i })).toBeVisible();
  });

  test('keyword search input is present', async ({ page }) => {
    await expect(page.getByPlaceholder(/mustang|keyword|search/i)).toBeVisible();
  });

  test('Apply Filters button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /apply filters/i })).toBeVisible();
  });

  test('Clear all button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /clear all/i })).toBeVisible();
  });

  test('shows listing count', async ({ page }) => {
    await expect(page.getByText(/listing/i).first()).toBeVisible();
  });

  test('keyword search updates URL and shows results heading', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/mustang|keyword|search/i);
    await searchInput.fill('Camaro');
    await searchInput.press('Enter');
    await expect(page).toHaveURL(/q=Camaro/i);
    await expect(page.getByRole('heading', { name: /search results/i })).toBeVisible();
  });

  test('applying make filter updates URL', async ({ page }) => {
    await page.selectOption('select', { label: /chevrolet/i });
    await page.getByRole('button', { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/make=Chevrolet/i);
  });

  test('clearing filters returns to base URL', async ({ page }) => {
    await page.goto('/listings?make=Chevrolet');
    await page.getByRole('button', { name: /clear all/i }).click();
    await expect(page).toHaveURL('/listings');
  });

  test('no-results state shows helpful message', async ({ page }) => {
    await page.goto('/listings?q=xyzzy1234notacar');
    await expect(page.getByText(/no listings found/i)).toBeVisible();
  });
});
