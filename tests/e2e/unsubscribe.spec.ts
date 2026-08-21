import { test, expect } from '@playwright/test';

// All unsubscribe pages show an error state for invalid/missing uid.
// We can test these without real auth since invalid uid is the common case.

const UNSUBSCRIBE_PAGES = [
  { path: '/unsubscribe/digest',       name: 'digest' },
  { path: '/unsubscribe/price-drops',  name: 'price drops' },
  { path: '/unsubscribe/alerts',       name: 'alerts' },
  { path: '/unsubscribe/dealer-report', name: 'dealer report' },
  { path: '/unsubscribe/car-sold',     name: 'car sold' },
  // newsletter unsubscribes by deleting the subscriber row rather than
  // flagging an existing auth user, so it can't tell "never existed" apart
  // from "already unsubscribed" -- it deliberately shows the friendlier
  // "already unsubscribed" state for both instead of "invalid link" (see
  // app/unsubscribe/newsletter/page.tsx).
  { path: '/unsubscribe/newsletter',   name: 'newsletter', notFoundIsAlreadyDone: true },
];

for (const { path, name, notFoundIsAlreadyDone } of UNSUBSCRIBE_PAGES) {
  test.describe(`Unsubscribe page — ${name}`, () => {
    test('renders without application error', async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(/Application error/i)).not.toBeVisible();
    });

    test('shows invalid link state when uid is missing', async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(/invalid link/i)).toBeVisible();
    });

    test('shows invalid link state for a non-UUID uid', async ({ page }) => {
      await page.goto(`${path}?uid=not-a-valid-uuid`);
      await expect(page.getByText(/invalid link/i)).toBeVisible();
    });

    test('shows invalid link state for a SQL injection attempt', async ({ page }) => {
      await page.goto(`${path}?uid=%27+OR+%271%27%3D%271`);
      await expect(page.getByText(/invalid link/i)).toBeVisible();
    });

    test('shows invalid link state for a well-formed but non-existent UUID', async ({ page }) => {
      await page.goto(`${path}?uid=00000000-0000-0000-0000-000000000000`);
      await expect(page.getByText(/Application error/i)).not.toBeVisible();
      // newsletter can't distinguish "never existed" from "already unsubscribed"
      // (see notFoundIsAlreadyDone comment above), so it shows that state instead.
      if (notFoundIsAlreadyDone) {
        await expect(page.getByText(/already unsubscribed/i)).toBeVisible();
      } else {
        await expect(page.getByText(/invalid link/i)).toBeVisible();
      }
    });

    test('shows GarageCherries branding', async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(/GarageCherries/i).first()).toBeVisible();
    });

    test('has a Browse listings link', async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('link', { name: /browse listings/i })).toBeVisible();
    });
  });
}
