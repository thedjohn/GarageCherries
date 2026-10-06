import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockAdminFrom, mockStorageFrom, mockRequireAdmin, mockFindState } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockStorageFrom: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockFindState: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom, storage: { from: mockStorageFrom } })),
}));
vi.mock('@/lib/admin', () => ({ requireAdmin: mockRequireAdmin, hasRole: vi.fn((role: string, min: string) => {
  const order = ['support', 'moderator', 'admin', 'superadmin'];
  return order.indexOf(role) >= order.indexOf(min);
}) }));
vi.mock('zipcodes-us', () => ({ findState: mockFindState }));
vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })) },
}));

import { POST as subscribePost } from '@/app/api/event-alerts/subscribe/route';
import { POST as uploadPost } from '@/app/api/garage/upload-image/route';
import { GET as garageVehiclesGet } from '@/app/api/admin/garage-vehicles/route';
import { POST as trackBuildViewPost } from '@/app/api/track-build-view/route';
import { GET as cronEventAlertsGet } from '@/app/api/cron/event-alerts/route';

// Chainable query stand-in: builder methods return itself; maybeSingle and
// awaiting resolve to `result`. Records every call for assertions.
function chain(result: unknown, calls: string[] = []) {
  const q: any = {};
  for (const m of ['select', 'eq', 'gte', 'or', 'limit', 'insert', 'upsert']) q[m] = vi.fn((...a: unknown[]) => { calls.push(`${m}:${JSON.stringify(a)}`); return q; });
  q.maybeSingle = vi.fn(() => Promise.resolve(result));
  q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
  return q;
}
const jsonReq = (body: unknown, headers: Record<string, string> = {}) => ({
  json: async () => body,
  headers: { get: (k: string) => headers[k.toLowerCase()] ?? headers[k] ?? null },
}) as unknown as NextRequest;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  mockRequireAdmin.mockResolvedValue('admin');
});

describe('POST /api/event-alerts/subscribe', () => {
  it.each([
    [{ zip: '63303' }, 'Valid email required.'],
    [{ email: 'not-an-email', zip: '63303' }, 'Valid email required.'],
    [{ email: 'a@x.com' }, 'A valid 5-digit ZIP code is required.'],
    [{ email: 'a@x.com', zip: '6330' }, 'A valid 5-digit ZIP code is required.'],
  ])('rejects bad input %j', async (body, error) => {
    const res: any = await subscribePost(jsonReq(body));
    expect(res._status).toBe(400);
    expect(res._data.error).toBe(error);
  });

  it('rejects a ZIP that does not map to a state', async () => {
    mockFindState.mockReturnValue({ isValid: false });
    const res: any = await subscribePost(jsonReq({ email: 'a@x.com', zip: '00000' }));
    expect(res._status).toBe(400);
  });

  it('subscribes with a normalized email and the ZIP state, clearing any prior unsubscribe', async () => {
    mockFindState.mockReturnValue({ isValid: true, stateCode: 'MO' });
    const calls: string[] = [];
    mockAdminFrom.mockReturnValue(chain({ error: null }, calls));
    const res: any = await subscribePost(jsonReq({ email: 'A@X.com', zip: ' 63303 ' }));
    expect(res._data).toEqual({ ok: true, state: 'MO' });
    expect(calls[0]).toBe('upsert:[{"email":"a@x.com","zip":"63303","state":"MO","unsubscribed_at":null},{"onConflict":"email"}]');
  });

  it('returns 500 when saving fails', async () => {
    mockFindState.mockReturnValue({ isValid: true, stateCode: 'MO' });
    mockAdminFrom.mockReturnValue(chain({ error: { message: 'db down' } }));
    const res: any = await subscribePost(jsonReq({ email: 'a@x.com', zip: '63303' }));
    expect(res._status).toBe(500);
  });
});

describe('POST /api/garage/upload-image', () => {
  function storage(result: { data: unknown; error: unknown }) {
    const createSignedUploadUrl = vi.fn(() => Promise.resolve(result));
    mockStorageFrom.mockReturnValue({ createSignedUploadUrl, getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn/garage-images/${p}` } }) });
    return createSignedUploadUrl;
  }

  it('requires sign-in', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res: any = await uploadPost(jsonReq({ fileName: 'a.jpg', contentType: 'image/jpeg' }));
    expect(res._status).toBe(401);
  });

  it('requires a file name and content type', async () => {
    const res: any = await uploadPost(jsonReq({ fileName: 'a.jpg' }));
    expect(res._status).toBe(400);
  });

  it.each([
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/jpeg', 'jpg'],
    ['image/heic', 'jpg'],
  ])('returns a signed upload URL for %s with a .%s path', async (contentType, ext) => {
    const create = storage({ data: { signedUrl: 'https://signed', token: 't1' }, error: null });
    const res: any = await uploadPost(jsonReq({ fileName: 'a', contentType }));
    expect(res._data.path.endsWith(`.${ext}`)).toBe(true);
    expect(res._data).toMatchObject({ signedUrl: 'https://signed', token: 't1' });
    expect(res._data.publicUrl).toBe(`https://cdn/garage-images/${res._data.path}`);
    expect(create).toHaveBeenCalledWith(res._data.path);
  });

  it('returns 500 when the signed URL cannot be created', async () => {
    storage({ data: null, error: { message: 'bucket missing' } });
    const res: any = await uploadPost(jsonReq({ fileName: 'a.jpg', contentType: 'image/jpeg' }));
    expect(res._status).toBe(500);
    expect(res._data.error).toBe('bucket missing');
    storage({ data: null, error: null });
    const res2: any = await uploadPost(jsonReq({ fileName: 'a.jpg', contentType: 'image/jpeg' }));
    expect(res2._data.error).toBe('Failed to create upload URL');
  });
});

describe('GET /api/admin/garage-vehicles', () => {
  const req = (qs: Record<string, string>) => ({ nextUrl: { searchParams: new URLSearchParams(qs) } }) as unknown as NextRequest;

  it('requires admin', async () => {
    mockRequireAdmin.mockResolvedValueOnce('moderator');
    const res: any = await garageVehiclesGet(req({ search: 'mustang' }));
    expect(res._status).toBe(401);
  });

  it('returns nothing without a search term', async () => {
    const res: any = await garageVehiclesGet(req({ search: '  ' }));
    expect(res._data).toEqual({ vehicles: [] });
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it('searches make, model and nickname, clamping the limit to 1-25', async () => {
    const calls: string[] = [];
    mockAdminFrom.mockReturnValue(chain({ data: [{ id: 'v1' }], error: null }, calls));
    const res: any = await garageVehiclesGet(req({ search: 'mustang', limit: '500' }));
    expect(res._data).toEqual({ vehicles: [{ id: 'v1' }] });
    expect(calls).toContain('or:["make.ilike.%mustang%,model.ilike.%mustang%,nickname.ilike.%mustang%"]');
    expect(calls).toContain('limit:[25]');
  });

  it('defaults the limit to 10 and returns an empty list for null data', async () => {
    const calls: string[] = [];
    mockAdminFrom.mockReturnValue(chain({ data: null, error: null }, calls));
    const res: any = await garageVehiclesGet(req({ search: 'gto' }));
    expect(res._data).toEqual({ vehicles: [] });
    expect(calls).toContain('limit:[10]');
  });

  it('returns 500 on a query error', async () => {
    mockAdminFrom.mockReturnValue(chain({ data: null, error: { message: 'db down' } }));
    const res: any = await garageVehiclesGet(req({ search: 'gto' }));
    expect(res._status).toBe(500);
  });
});

describe('POST /api/track-build-view', () => {
  it('ignores a request without a buildId', async () => {
    const res: any = await trackBuildViewPost(jsonReq({}));
    expect(res._data).toEqual({ ok: false });
  });

  it('records one view per visitor per build per day, never storing the raw IP', async () => {
    const calls: string[] = [];
    mockAdminFrom.mockImplementation(() => chain({ data: null }, calls));
    const res: any = await trackBuildViewPost(jsonReq({ buildId: 'b1' }, { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }));
    expect(res._data).toEqual({ ok: true });
    const insert = calls.find(c => c.startsWith('insert:'))!;
    expect(insert).toContain('"build_id":"b1"');
    expect(insert).not.toContain('9.9.9.9');
  });

  it('skips the insert when this visitor already viewed today (x-real-ip / unknown fallbacks)', async () => {
    const calls: string[] = [];
    mockAdminFrom.mockImplementation(() => chain({ data: { id: 'existing' } }, calls));
    await trackBuildViewPost(jsonReq({ buildId: 'b1' }, { 'x-real-ip': '8.8.8.8' }));
    await trackBuildViewPost(jsonReq({ buildId: 'b1' }));
    expect(calls.some(c => c.startsWith('insert:'))).toBe(false);
  });
});

describe('GET /api/cron/event-alerts', () => {
  const req = (auth?: string) => ({ headers: { get: (k: string) => (k === 'Authorization' ? auth ?? null : null) } }) as unknown as NextRequest;
  const origFetch = global.fetch;
  afterEach(() => { global.fetch = origFetch; delete process.env.NEXT_PUBLIC_SITE_URL; });

  it('rejects a wrong cron secret', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    const res: any = await cronEventAlertsGet(req('Bearer nope'));
    expect(res._status).toBe(401);
  });

  it('calls the email sender with the admin secret and passes its result through', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    process.env.ADMIN_API_SECRET = 'admin-secret';
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true, sent: 4 }) });
    global.fetch = fetchMock as any;
    const res: any = await cronEventAlertsGet(req('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, sent: 4 });
    expect(fetchMock).toHaveBeenCalledWith('https://www.garagecherries.com/api/email/event-alerts', expect.objectContaining({
      method: 'POST', headers: { Authorization: 'Bearer admin-secret' },
    }));
  });

  it('uses NEXT_PUBLIC_SITE_URL when set', async () => {
    process.env.CRON_SECRET = 'cron-secret';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://preview.example.com';
    const fetchMock = vi.fn().mockResolvedValue({ json: async () => ({ ok: true }) });
    global.fetch = fetchMock as any;
    await cronEventAlertsGet(req('Bearer cron-secret'));
    expect(fetchMock.mock.calls[0][0]).toBe('https://preview.example.com/api/email/event-alerts');
  });
});
