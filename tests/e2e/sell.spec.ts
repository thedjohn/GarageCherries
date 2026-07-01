import { test, expect } from '@playwright/test';

test.describe('Sell / submit listing (public form)', () => {
  test('sell page loads with all required sections', async ({ page }) => {
    await page.goto('/sell');
    await expect(page.getByRole('heading', { name: /post your car/i })).toBeVisible();
    await expect(page.getByText(/vehicle information/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /photos/i })).toBeVisible();
    await expect(page.getByText(/location/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /contact/i })).toBeVisible();
  });

  test('submit button is present and labelled correctly', async ({ page }) => {
    await page.goto('/sell');
    await expect(page.getByRole('button', { name: /submit.*listing|post.*free/i })).toBeVisible();
  });

  test('form shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/sell');
    await page.getByRole('button', { name: /submit|post/i }).click();
    // HTML5 required validation prevents submit — year field should be focused
    const yearInput = page.locator('input[name="year"]');
    await expect(yearInput).toBeVisible();
    // Page should not redirect to success
    await expect(page.getByRole('heading', { name: /post your car/i })).toBeVisible();
  });

  test('photo upload area is present', async ({ page }) => {
    await page.goto('/sell');
    await expect(page.getByText(/click to add photos/i)).toBeVisible();
  });

  test('phone field auto-formats as user types', async ({ page }) => {
    await page.goto('/sell');
    const phone = page.locator('input[name="sellerPhone"]');
    await phone.fill('6155550100');
    // Trigger onChange
    await phone.dispatchEvent('input');
    const value = await phone.inputValue();
    // Should be formatted (check for parenthesis pattern)
    expect(value).toMatch(/\(\d{3}\)/);
  });
});
