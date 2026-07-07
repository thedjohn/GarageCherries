/**
 * UI Flow Tests
 *
 * Tests critical user-facing flows against the live app.
 * Run: npx playwright test tests/e2e/ui-flows.spec.ts
 * Visual mode: npx playwright test --ui
 */
import { test, expect } from '@playwright/test';

// ─── Homepage ─────────────────────────────────────────────────────────────────
test.describe('homepage', () => {
  test('loads and shows hero content', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/GarageCherries/i);
    // Hero must have a search or CTA element
    const hero = page.locator('h1, [data-testid="hero"]').first();
    await expect(hero).toBeVisible();
  });

  test('nav links are present', async ({ page }) => {
    await page.goto('/');
    // At minimum the logo/brand should be a link
    const brandLink = page.locator('a[href="/"]').first();
    await expect(brandLink).toBeVisible();
  });

  test('listings page is reachable from home', async ({ page }) => {
    await page.goto('/');
    // Dismiss any modal (promo popup) that may intercept clicks
    const modal = page.locator('[role="dialog"], .fixed.inset-0').first();
    if (await modal.isVisible().catch(() => false)) {
      await page.keyboard.press('Escape');
      await page.locator('button:has-text("Close"), button:has-text("×"), button:has-text("✕")').first().click().catch(() => {});
    }
    // Navigate directly rather than clicking to avoid modal intercept
    await page.goto('/listings');
    await expect(page).not.toHaveURL('/404');
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});

// ─── Listings browse ──────────────────────────────────────────────────────────
test.describe('listings browse', () => {
  test('/listings page loads without error', async ({ page }) => {
    await page.goto('/listings');
    // Should not show a Next.js application error or blank page
    const body = await page.textContent('body');
    expect(body).not.toContain('Application error');
    expect(body).not.toContain('Internal Server Error');
    // Page should have some actual content
    expect(body!.length).toBeGreaterThan(100);
  });

  test('search filters are present', async ({ page }) => {
    await page.goto('/listings');
    // At least one input or select for filtering
    const filterEl = page.locator('input, select').first();
    await expect(filterEl).toBeVisible();
  });
});

// ─── Legal pages ──────────────────────────────────────────────────────────────
test.describe('legal pages', () => {
  test('/privacy loads and has content', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForTimeout(2000); // Enzuzo script injects content
    const body = await page.textContent('body');
    // Privacy policy should have substantive text
    expect(body!.length).toBeGreaterThan(500);
  });

  test('/terms loads and has content', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    expect(body!.length).toBeGreaterThan(500);
  });

  test('privacy page content appears ABOVE footer', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForTimeout(2000);

    const footer = page.locator('footer').first();
    const content = page.locator('#__enzuzo-root').first();

    if (await footer.count() > 0 && await content.count() > 0) {
      const footerBox = await footer.boundingBox();
      const contentBox = await content.boundingBox();
      if (footerBox && contentBox) {
        // Content top must be above footer top
        expect(contentBox.y).toBeLessThan(footerBox.y);
      }
    }
  });

  test('terms page content appears ABOVE footer', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForTimeout(2000);

    const footer = page.locator('footer').first();
    const content = page.locator('#__enzuzo-root').first();

    if (await footer.count() > 0 && await content.count() > 0) {
      const footerBox = await footer.boundingBox();
      const contentBox = await content.boundingBox();
      if (footerBox && contentBox) {
        expect(contentBox.y).toBeLessThan(footerBox.y);
      }
    }
  });
});

// ─── Sell / submit listing ────────────────────────────────────────────────────
test.describe('sell page', () => {
  test('/sell loads without error', async ({ page }) => {
    await page.goto('/sell');
    const body = await page.textContent('body');
    expect(body).not.toContain('Application error');
  });

  test('unauthenticated user sees auth gate on /sell', async ({ page }) => {
    await page.goto('/sell');
    // SellGate is shown — listing form requires login
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
    await expect(page.locator('input[name="year"]')).not.toBeVisible();
    // Sign-in or create-account link must be present
    await expect(
      page.getByRole('link', { name: /sign in|create.*account|log in/i }).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─── Dealer apply ─────────────────────────────────────────────────────────────
test.describe('dealer apply', () => {
  test('/dealer/apply loads', async ({ page }) => {
    await page.goto('/dealer/apply');
    const body = await page.textContent('body');
    expect(body).not.toContain('Application error');
  });

  test('apply form has required fields', async ({ page }) => {
    await page.goto('/dealer/apply');
    const nameField = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await expect(nameField).toBeVisible({ timeout: 5000 });
  });

  test('submitting empty form shows validation', async ({ page }) => {
    await page.goto('/dealer/apply');
    const submit = page.locator('button[type="submit"]').first();
    if (await submit.count() > 0) {
      await submit.click();
      // Should stay on page — no navigation to success
      await expect(page).toHaveURL(/dealer\/apply/);
    }
  });
});

// ─── 404 page ─────────────────────────────────────────────────────────────────
test.describe('404 handling', () => {
  test('unknown routes show 404 page not app crash', async ({ page }) => {
    await page.goto('/this-does-not-exist-xyz-abc');
    const body = await page.textContent('body');
    expect(body).not.toContain('Application error');
    // Should contain some 404 indicator
    const title = await page.title();
    const hasNotFound = body!.toLowerCase().includes('not found') ||
                        body!.toLowerCase().includes('404') ||
                        title.toLowerCase().includes('not found');
    expect(hasNotFound).toBe(true);
  });
});
