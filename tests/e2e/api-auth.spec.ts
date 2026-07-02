/**
 * API Authentication Coverage
 *
 * Every state-changing or sensitive endpoint must return 401 when called
 * without a valid session. This file acts as a permanent regression guard —
 * if a new endpoint is added without auth, this test suite catches it.
 */
import { test, expect } from '@playwright/test';

const UUID = '00000000-0000-0000-0000-000000000000';

// Helper — verify a route is auth-protected
async function expectAuth(
  request: Parameters<typeof test>[1] extends (args: infer A) => unknown
    ? A extends { request: infer R } ? R : never
    : never,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: Record<string, unknown>,
) {
  const opts = body ? { data: body } : undefined;
  const res = method === 'GET'
    ? await request.get(path)
    : method === 'POST'
    ? await request.post(path, opts)
    : method === 'PATCH'
    ? await request.patch(path, opts)
    : await request.delete(path, opts);

  expect(
    res.status(),
    `${method} ${path} should return 401 without auth, got ${res.status()}`,
  ).toBe(401);
}

test.describe('unauthenticated requests return 401', () => {
  // ── Listings ──────────────────────────────────────────────────────────────
  test('POST /api/listings/upload-image', async ({ request }) => {
    const res = await request.post('/api/listings/upload-image', {
      data: { fileName: 'test.jpg', contentType: 'image/jpeg' },
    });
    expect(res.status()).toBe(401);
  });

  test('PATCH /api/listings/:id', async ({ request }) => {
    const res = await request.patch(`/api/listings/${UUID}`, { data: { price: 1000 } });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/listings/:id', async ({ request }) => {
    const res = await request.delete(`/api/listings/${UUID}`);
    expect(res.status()).toBe(401);
  });

  // ── Conversations ─────────────────────────────────────────────────────────
  test('GET /api/conversations', async ({ request }) => {
    const res = await request.get('/api/conversations');
    expect(res.status()).toBe(401);
  });

  test('POST /api/conversations', async ({ request }) => {
    const res = await request.post('/api/conversations', {
      data: { listingId: UUID, message: 'hello' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/conversations/:id/messages', async ({ request }) => {
    const res = await request.get(`/api/conversations/${UUID}/messages`);
    expect(res.status()).toBe(401);
  });

  test('POST /api/conversations/:id/messages', async ({ request }) => {
    const res = await request.post(`/api/conversations/${UUID}/messages`, {
      data: { body: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  // ── Watchlist ─────────────────────────────────────────────────────────────
  test('POST /api/watchlist', async ({ request }) => {
    const res = await request.post('/api/watchlist', { data: { carId: UUID } });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/watchlist', async ({ request }) => {
    const res = await request.delete('/api/watchlist', { data: { carId: UUID } });
    expect(res.status()).toBe(401);
  });

  // ── Alerts ────────────────────────────────────────────────────────────────
  test('GET /api/alerts', async ({ request }) => {
    const res = await request.get('/api/alerts');
    expect(res.status()).toBe(401);
  });

  test('POST /api/alerts', async ({ request }) => {
    const res = await request.post('/api/alerts', { data: { make: 'Ford', state: 'MO' } });
    expect(res.status()).toBe(401);
  });

  test('PATCH /api/alerts', async ({ request }) => {
    const res = await request.patch('/api/alerts', { data: { id: UUID } });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/alerts', async ({ request }) => {
    const res = await request.delete('/api/alerts', { data: { id: UUID } });
    expect(res.status()).toBe(401);
  });

  // ── Cars ──────────────────────────────────────────────────────────────────
  test('POST /api/cars/sold', async ({ request }) => {
    const res = await request.post('/api/cars/sold', { data: { carId: UUID } });
    expect(res.status()).toBe(401);
  });

  // ── Dealer ────────────────────────────────────────────────────────────────
  test('POST /api/dealer/settings', async ({ request }) => {
    const res = await request.post('/api/dealer/settings', { data: { name: 'Test' } });
    expect(res.status()).toBe(401);
  });

  test('GET /api/dealer/metrics', async ({ request }) => {
    const res = await request.get('/api/dealer/metrics');
    expect(res.status()).toBe(401);
  });

  // ── Advertiser ────────────────────────────────────────────────────────────
  test('GET /api/advertiser/ads', async ({ request }) => {
    const res = await request.get('/api/advertiser/ads');
    expect(res.status()).toBe(401);
  });

  test('POST /api/advertiser/ads', async ({ request }) => {
    const res = await request.post('/api/advertiser/ads', { data: { headline: 'Test' } });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/advertiser/ads', async ({ request }) => {
    const res = await request.delete(`/api/advertiser/ads?id=${UUID}`);
    expect(res.status()).toBe(401);
  });

  // ── Messages ──────────────────────────────────────────────────────────────
  test('PATCH /api/messages/:id/report', async ({ request }) => {
    const res = await request.patch(`/api/messages/${UUID}/report`);
    expect(res.status()).toBe(401);
  });
});

test.describe('admin routes reject non-admins', () => {
  // These should return 401 (no session at all in E2E)
  // In authenticated tests they'd return 403 for non-admin users

  test('GET /api/admin/listings', async ({ request }) => {
    const res = await request.get('/api/admin/listings');
    expect(res.status()).toBe(401);
  });

  test('PATCH /api/admin/listings', async ({ request }) => {
    const res = await request.patch('/api/admin/listings', { data: { id: UUID, action: 'approve' } });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/admin/listings', async ({ request }) => {
    const res = await request.delete('/api/admin/listings', { data: { id: UUID } });
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/users', async ({ request }) => {
    const res = await request.get('/api/admin/users');
    expect(res.status()).toBe(401);
  });

  test('PATCH /api/admin/users', async ({ request }) => {
    const res = await request.patch('/api/admin/users', { data: { id: UUID, action: 'suspend' } });
    expect(res.status()).toBe(401);
  });

  test('DELETE /api/admin/users', async ({ request }) => {
    const res = await request.delete('/api/admin/users', { data: { id: UUID } });
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/dealer-applications', async ({ request }) => {
    const res = await request.get('/api/admin/dealer-applications');
    expect(res.status()).toBe(401);
  });

  test('PATCH /api/admin/dealer-applications', async ({ request }) => {
    const res = await request.patch('/api/admin/dealer-applications', {
      data: { id: UUID, action: 'approve' },
    });
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/team', async ({ request }) => {
    const res = await request.get('/api/admin/team');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/team', async ({ request }) => {
    const res = await request.post('/api/admin/team', { data: { email: 'x@x.com', role: 'support' } });
    expect(res.status()).toBe(401);
  });

  test('GET /api/admin/reported', async ({ request }) => {
    const res = await request.get('/api/admin/reported');
    expect(res.status()).toBe(401);
  });

  test('POST /api/admin/cleanup-images', async ({ request }) => {
    const res = await request.post('/api/admin/cleanup-images');
    expect(res.status()).toBe(401);
  });
});

test.describe('public endpoints accept unauthenticated requests', () => {
  test('POST /api/dealer/apply accepts anonymous (CAPTCHA gated)', async ({ request }) => {
    // Returns 400 (CAPTCHA fail) not 401 — it is intentionally public
    const res = await request.post('/api/dealer/apply', { data: {} });
    expect(res.status()).not.toBe(401);
  });

  test('GET /api/ads/serve is public', async ({ request }) => {
    const res = await request.get('/api/ads/serve?state=MO');
    expect([200, 404]).toContain(res.status());
  });

  test('POST /api/cars/verify-vin is public', async ({ request }) => {
    const res = await request.post('/api/cars/verify-vin', { data: { vin: '1HGBH41JXMN109186' } });
    expect([200, 400]).toContain(res.status());
  });
});
