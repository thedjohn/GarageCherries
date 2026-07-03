import { test, expect } from '@playwright/test';

test.describe('Buyer login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/account/login');
  });

  test('renders without error', async ({ page }) => {
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('shows email and password inputs', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('shows a sign in / login button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /sign in|log in/i })
    ).toBeVisible();
  });

  test('has a link to sign up', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /sign up|create account/i })
    ).toBeVisible();
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
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test('shows a create account / sign up button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create account|sign up/i })
    ).toBeVisible();
  });

  test('has a link back to login', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /sign in|log in|already have/i })
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
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('shows a sign in button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /sign in|log in/i })
    ).toBeVisible();
  });

  test('has a link to dealer apply', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /apply|become a dealer/i })
    ).toBeVisible();
  });
});

test.describe('Forgot password page', () => {
  test('renders the reset form', async ({ page }) => {
    await page.goto('/account/forgot-password');
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send|reset/i })).toBeVisible();
  });
});

test.describe('/sell page (unauthenticated)', () => {
  test('shows gate / login prompt for unauthenticated users', async ({ page }) => {
    await page.goto('/sell');
    // Should either redirect to login or show SellGate with a sign-in CTA
    const isLoginPage = page.url().includes('/account/login') || page.url().includes('/sell');
    expect(isLoginPage).toBe(true);
    // Either on login page or sell gate is shown
    const gateOrLogin = await page.getByRole('link', { name: /sign in|log in|create.*account/i }).count();
    const loginPage = await page.getByLabel(/email/i).count();
    expect(gateOrLogin + loginPage).toBeGreaterThan(0);
  });
});
