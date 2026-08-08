import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom, mockStorageRemove } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockStorageRemove: vi.fn(async () => ({ data: null, error: null })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: () => ({ remove: mockStorageRemove }) },
  })),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, POST, DELETE } from '@/app/api/dealer/inspection/route';

function makeGetReq(carId: string) {
  return { nextUrl: new URL(`http://x/api/dealer/inspection?carId=${carId}`) } as unknown as NextRequest;
}
function makePostReq(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}
function makeDeleteReq(carId: string) {
  return { nextUrl: new URL(`http://x/api/dealer/inspection?carId=${carId}`) } as unknown as NextRequest;
}

const DEALER_ROW = { id: 'dealer-1' };
const OWNED_LISTING = { id: 'car-1', seller_id: 'dealer-1' };

function makeFromMock(opts: {
  dealerLookup?: any;
  listingLookup?: any;
  existingReport?: any;
  upsertResult?: { data?: any; error?: any };
}) {
  const calls: { table: string; op: string; payload?: any }[] = [];

  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') {
      return { select: () => ({ or: () => ({ single: () => Promise.resolve({ data: opts.dealerLookup !== undefined ? opts.dealerLookup : DEALER_ROW }) }) }) };
    }
    if (table === 'listings') {
      return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: opts.listingLookup !== undefined ? opts.listingLookup : OWNED_LISTING }) }) }) };
    }
    if (table === 'listing_inspections') {
      return {
        select: (cols: string) => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: opts.existingReport ?? null, error: null }),
          }),
        }),
        upsert: (payload: any) => {
          calls.push({ table, op: 'upsert', payload });
          return { select: () => ({ single: () => Promise.resolve(opts.upsertResult ?? { data: { id: 'insp-1', ...payload } }) }) };
        },
        delete: () => {
          calls.push({ table, op: 'delete' });
          return { eq: () => Promise.resolve({ error: null }) };
        },
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'dealer-1', email: 'dealer@x.com' } } });
  mockStorageRemove.mockResolvedValue({ data: null, error: null });
});

describe('GET /api/dealer/inspection', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await GET(makeGetReq('car-1'));
    expect(res._status).toBe(401);
  });

  it('returns 403 when the authenticated user has no dealer account', async () => {
    makeFromMock({ dealerLookup: null });
    const res: any = await GET(makeGetReq('car-1'));
    expect(res._status).toBe(403);
  });

  it("returns 404 when the listing doesn't belong to this dealer", async () => {
    makeFromMock({ listingLookup: { id: 'car-1', seller_id: 'someone-else' } });
    const res: any = await GET(makeGetReq('car-1'));
    expect(res._status).toBe(404);
  });

  it('returns the existing report when one exists', async () => {
    makeFromMock({ existingReport: { id: 'insp-1', provider_name: 'Lemon Squad' } });
    const res: any = await GET(makeGetReq('car-1'));
    expect(res._status).toBe(200);
    expect(res._data.report.provider_name).toBe('Lemon Squad');
  });

  it('returns null when no report is attached yet', async () => {
    makeFromMock({});
    const res: any = await GET(makeGetReq('car-1'));
    expect(res._data.report).toBeNull();
  });
});

describe('POST /api/dealer/inspection', () => {
  it('requires a provider name', async () => {
    makeFromMock({});
    const res: any = await POST(makePostReq({ carId: 'car-1', providerName: '', reportUrl: 'https://x/report.pdf' }));
    expect(res._status).toBe(400);
  });

  it('requires a report file URL', async () => {
    makeFromMock({});
    const res: any = await POST(makePostReq({ carId: 'car-1', providerName: 'Lemon Squad', reportUrl: '' }));
    expect(res._status).toBe(400);
  });

  it("returns 404 when the listing doesn't belong to this dealer", async () => {
    makeFromMock({ listingLookup: { id: 'car-1', seller_id: 'someone-else' } });
    const res: any = await POST(makePostReq({ carId: 'car-1', providerName: 'Lemon Squad', reportUrl: 'https://x/report.pdf' }));
    expect(res._status).toBe(404);
  });

  it('upserts the report keyed on listing_id', async () => {
    const calls = makeFromMock({});
    const res: any = await POST(makePostReq({
      carId: 'car-1', providerName: 'Lemon Squad', reportDate: '2026-08-01',
      summary: 'Clean inspection', reportUrl: 'https://x/report.pdf', photoUrls: ['https://x/1.jpg'],
    }));
    expect(res._status).toBe(200);
    const upsertCall = calls.find(c => c.op === 'upsert');
    expect(upsertCall!.payload).toMatchObject({
      listing_id: 'car-1', provider_name: 'Lemon Squad', report_date: '2026-08-01',
      summary: 'Clean inspection', report_url: 'https://x/report.pdf', photo_urls: ['https://x/1.jpg'],
    });
  });
});

describe('DELETE /api/dealer/inspection', () => {
  it("returns 404 when the listing doesn't belong to this dealer", async () => {
    makeFromMock({ listingLookup: { id: 'car-1', seller_id: 'someone-else' } });
    const res: any = await DELETE(makeDeleteReq('car-1'));
    expect(res._status).toBe(404);
  });

  it('deletes the report row and cleans up storage files', async () => {
    const calls = makeFromMock({ existingReport: { report_url: 'https://x/inspection-reports/car-1/report.pdf', photo_urls: ['https://x/inspection-reports/car-1/1.jpg'] } });
    const res: any = await DELETE(makeDeleteReq('car-1'));
    expect(res._status).toBe(200);
    expect(calls.some(c => c.table === 'listing_inspections' && c.op === 'delete')).toBe(true);
    expect(mockStorageRemove).toHaveBeenCalledWith(['car-1/report.pdf', 'car-1/1.jpg']);
  });

  it('skips storage cleanup when there was nothing attached', async () => {
    makeFromMock({ existingReport: null });
    await DELETE(makeDeleteReq('car-1'));
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });
});
