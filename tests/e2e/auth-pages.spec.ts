import { test, expect } from '@playwright/test';

test.describe('Buyer login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/login');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('shows email and password inputs', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows a sign in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('has a link to create an account', async ({ page }) => {
    await expect(page.getByRole('link', { name: /create free account/i })).toBeVisible();
  });

  test('has a forgot password link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
  });
});

test.describe('Buyer signup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/signup');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('shows email and password inputs', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('shows a create account button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('has a link back to sign in', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Dealer login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dealer/login');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('shows email and password inputs', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('shows a sign in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('has a link to apply for a dealer account', async ({ page }) => {
    await expect(page.getByRole('link', { name: /apply/i })).toBeVisible();
  });
});

test.describe('Forgot password page', () => {
  test('renders the reset form', async ({ page }) => {
    await page.goto('/account/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible();
  });
});

test.describe('/sell page', () => {
  test('renders without error', async ({ page }) => {
    await page.goto('/sell');
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('shows the post a listing form', async ({ page }) => {
    await page.goto('/sell');
    await expect(page.getByRole('heading', { name: /post your car/i })).toBeVisible();
  });
});
