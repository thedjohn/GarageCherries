import { test, expect } from '@playwright/test';

test.describe('Buyer login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/login');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('shows email and password inputs', async ({ page }) => {
    await expect(page.getByPlaceholder(/you@example\.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/••••/)).toBeVisible();
  });

  test('shows a sign in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('has a link to create a free account', async ({ page }) => {
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
    await expect(page.getByPlaceholder(/you@example\.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/••••/).first()).toBeVisible();
  });

  test('shows a create account button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create account/i })
    ).toBeVisible();
  });

  test('has a link back to sign in', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /sign in/i })
    ).toBeVisible();
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
    await expect(page.getByPlaceholder(/you@example\.com|email/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/••••/)).toBeVisible();
  });

  test('shows a sign in button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('has a link to dealer apply', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /apply/i })
    ).toBeVisible();
  });
});

test.describe('Forgot password page', () => {
  test('renders the reset form', async ({ page }) => {
    await page.goto('/account/forgot-password');
    await expect(page.getByPlaceholder(/you@example\.com|email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send|reset/i })).toBeVisible();
  });
});

test.describe('/sell page (unauthenticated)', () => {
  test('shows gate or redirects to login for unauthenticated users', async ({ page }) => {
    await page.goto('/sell');
    const isLoginPage = page.url().includes('/account/login') || page.url().includes('/sell');
    expect(isLoginPage).toBe(true);
    const gateLinks = await page.getByRole('link', { name: /sign in|log in|create.*account/i }).count();
    const loginInputs = await page.getByPlaceholder(/you@example\.com/i).count();
    expect(gateLinks + loginInputs).toBeGreaterThan(0);
  });
});
