import { test, expect } from '@playwright/test';

test.describe('Events page', () => {
  test('/events loads without error', async ({ page }) => {
    await page.goto('/events');
    const body = await page.textContent('body');
    expect(body).not.toContain('Application error');
    expect(body!.length).toBeGreaterThan(100);
  });

  test('logged-out visitor sees sign-in CTA, not the submit form', async ({ page }) => {
    await page.goto('/events');
    // The submit form fields should not be visible to anonymous visitors
    await expect(page.locator('input[name="title"]')).not.toBeVisible();
    await expect(page.locator('input[name="location"]')).not.toBeVisible();
    // A sign-in link must be present in the SubmitEventForm CTA
    await expect(
      page.getByRole('link', { name: /sign in|log in|create.*account/i }).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('page lists approved events or shows empty state', async ({ page }) => {
    await page.goto('/events');
    // Either event cards or an empty-state message — never a blank page
    const hasEvents = await page.locator('[data-testid="event-card"], h2, h3').count();
    expect(hasEvents).toBeGreaterThan(0);
  });
});

test.describe('Events submit API', () => {
  test('POST /api/events/submit returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post('/api/events/submit', {
      data: {
        title: 'Test Car Show',
        date: '2026-08-01',
        location: 'St. Louis, MO',
        type: 'show',
        description: 'A test event',
      },
    });
    expect(res.status()).toBe(401);
  });
});
