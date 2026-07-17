/**
 * Buyer golden-path regression tests
 *
 * Covers the full unauthenticated buyer journey:
 * Browse → Filter → Detail page → Contact/Watchlist/Inspection sidebar
 *
 * Authenticated flows (watchlist save, messaging) are tested as API guards
 * in api-auth.spec.ts. Browser-level auth flows live in auth.spec.ts.
 *
 * All tests gracefully skip when the DB has no listings.
 */
import { test, expect, type Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function navigateToFirstListing(page: Page): Promise<boolean> {
  await page.goto('/listings');
  const card = page.locator('a[href*="/listings/"]').first();
  if (await card.count() === 0) return false;
  await card.click();
  await page.waitForLoadState('domcontentloaded');
  return true;
}

// ── Browse → Filter → Results ─────────────────────────────────────────────────

test.describe('Browse and filter', () => {
  test('keyword search from /listings navigates to results', async ({ page }) => {
    await page.goto('/listings');
    const input = page.getByPlaceholder(/mustang|keyword|search/i);
    await input.fill('Mustang');
    await input.press('Enter');
    await expect(page).toHaveURL(/q=Mustang/i);
    await expect(page.getByRole('heading', { name: /search results/i })).toBeVisible();
  });

  test('keyword search with no matches shows empty state', async ({ page }) => {
    await page.goto('/listings?q=zzznotacarzzz9999');
    await expect(page.getByText(/no listings found/i)).toBeVisible();
  });

  test('body style filter applies correctly', async ({ page }) => {
    await page.goto('/listings');
    // The "Body Style" <label> and its <select> are siblings with no for/id
    // association, so getByLabel() won't find it — locate via the label text
    // instead of a brittle positional index (which broke once before, when an
    // earlier filter's layout changed and shifted every select's index).
    const styleSelect = page.locator('label', { hasText: 'Body Style' }).locator('xpath=following-sibling::select');
    await styleSelect.selectOption('Coupe');
    await page.getByRole('button', { name: /apply filters/i }).click();
    await expect(page).toHaveURL(/bodyStyle=Coupe/i);
  });

  test('year range filter round-trips through URL', async ({ page }) => {
    await page.goto('/listings?year_min=1960&year_max=1975');
    await expect(page.getByRole('heading', { name: /search results/i })).toBeVisible();
    // Filters are applied — no app error
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('price filter round-trips through URL', async ({ page }) => {
    await page.goto('/listings?price_max=50000');
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});

// ── Listing detail — core content ────────────────────────────────────────────

test.describe('Listing detail page — core content', () => {
  test('shows vehicle title and price', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    await expect(page.getByText(/\$[\d,]+|Call for price/i).first()).toBeVisible();
    // Title is the page <h1>
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    const title = await h1.innerText();
    expect(title.length).toBeGreaterThan(5);
  });

  test('shows condition badge', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    await expect(
      page.getByText(/excellent|good|fair|project|new/i).first()
    ).toBeVisible();
  });

  test('shows photo gallery with navigation', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    await expect(page.getByRole('button', { name: /previous|next/i }).first()).toBeVisible();
  });

  test('spec sheet sections are visible', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    // Spec section headers use all-caps labels
    await expect(page.getByText(/DETAILS|EXTERIOR|ENGINE/i).first()).toBeVisible();
  });

  test('breadcrumb navigation is present and correct', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    const breadcrumb = page.getByRole('navigation').filter({ hasText: /listings/i });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole('link', { name: /listings/i })).toBeVisible();
  });

  test('has no application errors', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });
});

// ── Listing detail — sidebar ──────────────────────────────────────────────────

test.describe('Listing detail page — sidebar', () => {
  test('Save to Watchlist button is visible', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    await expect(
      page.getByRole('button', { name: /save to watchlist|saved/i })
    ).toBeVisible();
  });

  test('Message Seller / Sign In to Message button is visible', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    await expect(
      page.getByRole('button', { name: /message seller|sign in to message/i }).first()
    ).toBeVisible();
  });

  test('financing calculator section is present', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    await expect(
      page.getByRole('button', { name: /financing calculator/i })
    ).toBeVisible();
  });
});

// ── Listing detail — contact form ────────────────────────────────────────────

test.describe('Listing detail page — contact form', () => {
  test('contact form or message button is visible for unauthenticated user', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    // Wait for hydration, then check for any of: message button, contact form, sign-in prompt
    await page.waitForLoadState('networkidle');
    const hasMessageBtn = (await page.getByRole('button', { name: /message seller|send message/i }).count()) > 0;
    const hasForm = (await page.getByPlaceholder(/name|your name/i).count()) > 0;
    const hasSignIn = (await page.getByText(/sign in to/i).count()) > 0;
    expect(hasMessageBtn || hasForm || hasSignIn).toBe(true);
  });

  test('contact form does not submit empty message', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    const messageBtn = page.getByRole('button', { name: /send message|send/i }).last();
    if (!await messageBtn.isVisible()) { test.skip(); return; }

    await messageBtn.click();
    // Should not navigate away — still on listing detail URL
    await expect(page).toHaveURL(/\/listings\/.+\/.+\/.+/);
  });
});

// ── Unauthenticated watchlist redirect ───────────────────────────────────────

test.describe('Watchlist — unauthenticated', () => {
  test('clicking Save to Watchlist without auth prompts sign-in', async ({ page }) => {
    const found = await navigateToFirstListing(page);
    if (!found) { test.skip(); return; }

    const btn = page.getByRole('button', { name: /save to watchlist/i });
    await expect(btn).toBeVisible();
    await btn.click();

    // Should either redirect to login or show an error/modal — not silently succeed
    const redirected = page.url().includes('/login') || page.url().includes('/account');
    const errorVisible = await page.getByText(/sign in|log in|login/i).first().isVisible().catch(() => false);
    expect(redirected || errorVisible).toBe(true);
  });

  test('GET /api/watchlist requires auth', async ({ request }) => {
    const res = await request.get('/api/watchlist');
    expect([401, 405]).toContain(res.status());
  });

  test('POST /api/watchlist requires auth', async ({ request }) => {
    const res = await request.post('/api/watchlist', {
      data: { carId: '00000000-0000-0000-0000-000000000000' },
    });
    expect(res.status()).toBe(401);
  });
});

// ── Car Alerts signup gate ────────────────────────────────────────────────────

test.describe('Car Alerts — unauthenticated', () => {
  test('GET /api/alerts requires auth', async ({ request }) => {
    const res = await request.get('/api/alerts');
    expect(res.status()).toBe(401);
  });

  test('POST /api/alerts requires auth', async ({ request }) => {
    const res = await request.post('/api/alerts', {
      data: { make: 'Ford', state: 'MO' },
    });
    expect(res.status()).toBe(401);
  });
});

// ── Make / model pages ───────────────────────────────────────────────────────

test.describe('Make and model encyclopedia pages', () => {
  test('/cars loads the encyclopedia index', async ({ page }) => {
    await page.goto('/cars');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
  });

  test('/cars/chevrolet loads a make page', async ({ page }) => {
    await page.goto('/listings/chevrolet');
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
    // Either listings or a "no listings" message
    await expect(page.getByText(/chevrolet/i).first()).toBeVisible();
  });
});

// ── Sold archive ─────────────────────────────────────────────────────────────

test.describe('Sold archive', () => {
  test('/sold page loads without error', async ({ page }) => {
    await page.goto('/sold');
    await expect(page.getByText(/Application error/i)).not.toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible();
  });
});
