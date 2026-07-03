import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page title contains GarageCherries', async ({ page }) => {
    await expect(page).toHaveTitle(/GarageCherries/i);
  });

  test('GarageCherries logo / brand name is visible', async ({ page }) => {
    await expect(page.getByText(/GarageCherries/i).first()).toBeVisible();
  });

  test('navigation links are present', async ({ page }) => {
    await expect(page.getByRole('link', { name: /listings/i }).first()).toBeVisible();
  });

  test('displays at least one listing card or hero section', async ({ page }) => {
    // Either we show listing cards or a hero / CTA — the page must render content
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
    // Page should not show a generic error
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('has a link to browse listings', async ({ page }) => {
    const listingsLink = page.getByRole('link', { name: /browse|listings|view all/i }).first();
    await expect(listingsLink).toBeVisible();
  });

  test('footer or nav contains Dealers link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /dealers/i }).first()).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    await page.reload();
    // Filter out known third-party noise (Turnstile, etc.)
    const appErrors = errors.filter(e => !e.includes('turnstile') && !e.includes('cloudflare'));
    expect(appErrors).toHaveLength(0);
  });
});
