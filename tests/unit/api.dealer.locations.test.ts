import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET, POST, PATCH, DELETE } from '@/app/api/dealer/locations/route';

function makeGetReq() {
  return { nextUrl: new URL('http://x/api/dealer/locations') } as unknown as NextRequest;
}
function makePostReq(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}
function makeDeleteReq(id: string) {
  return { nextUrl: new URL(`http://x/api/dealer/locations?id=${id}`) } as unknown as NextRequest;
}

const DEALER_ROW = { id: 'dealer-1' };

// Builds a from() mock that dispatches per-table, per-call-shape canned responses.
// `calls` records every operation so tests can assert on exact writes.
function makeFromMock(opts: {
  dealerLookup?: any;
  locationsList?: any[];
  ownershipCheck?: any;
  primaryLocation?: any;
  insertResult?: { data?: any; error?: any };
}) {
  const calls: { table: string; op: string; payload?: any }[] = [];

  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') {
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: opts.dealerLookup !== undefined ? opts.dealerLookup : DEALER_ROW }) }) }),
        update: (payload: any) => { calls.push({ table, op: 'update', payload }); return { eq: () => Promise.resolve({ error: null }) }; },
      };
    }
    if (table === 'dealer_locations') {
      return {
        select: (cols: string) => {
          if (cols === '*') {
            // GET: list all locations
            return { eq: () => ({ order: () => Promise.resolve({ data: opts.locationsList ?? [], error: null }) }) };
          }
          if (cols.includes('address')) {
            // mirrorPrimaryToDealer's lookup
            return { eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.primaryLocation ?? null }) }) }) };
          }
          // ownership check (PATCH/DELETE): select('id').eq('id',...).eq('dealer_id',...).maybeSingle()
          return { eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.ownershipCheck !== undefined ? opts.ownershipCheck : { id: 'loc-1' } }) }) }) };
        },
        insert: (payload: any) => {
          calls.push({ table, op: 'insert', payload });
          return { select: () => ({ single: () => Promise.resolve(opts.insertResult ?? { data: { id: 'new-loc', ...payload } }) }) };
        },
        update: (payload: any) => {
          calls.push({ table, op: 'update', payload });
          return { eq: () => Promise.resolve({ error: null }) };
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
  mockGetUser.mockResolvedValue({ data: { user: { id: 'dealer-1' } } });
});

describe('GET /api/dealer/locations', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await GET(makeGetReq());
    expect(res._status).toBe(401);
  });

  it('returns 403 when the authenticated user has no dealer account', async () => {
    makeFromMock({ dealerLookup: null });
    const res: any = await GET(makeGetReq());
    expect(res._status).toBe(403);
  });

  it("returns the dealer's locations", async () => {
    makeFromMock({ locationsList: [{ id: 'loc-1', city: 'Tampa', state: 'FL' }] });
    const res: any = await GET(makeGetReq());
    expect(res._data.locations).toHaveLength(1);
    expect(res._data.locations[0].city).toBe('Tampa');
  });
});

describe('POST /api/dealer/locations', () => {
  it('requires city and state', async () => {
    makeFromMock({});
    const res: any = await POST(makePostReq({ city: '', state: '' }));
    expect(res._status).toBe(400);
  });

  it('inserts a non-primary location without touching other locations or the dealer row', async () => {
    const calls = makeFromMock({});
    const res: any = await POST(makePostReq({ city: 'Chicago', state: 'il' }));
    expect(res._status).toBe(200);
    const insertCall = calls.find(c => c.op === 'insert');
    expect(insertCall!.payload).toMatchObject({ dealer_id: 'dealer-1', city: 'Chicago', state: 'IL', is_primary: false });
    expect(calls.some(c => c.table === 'dealers' && c.op === 'update')).toBe(false);
  });

  it('unsets other primaries and mirrors onto the dealer row when adding a primary location', async () => {
    const calls = makeFromMock({ primaryLocation: { address: '123 Main St', city: 'Tampa', state: 'FL', zip: '33602', phone: '5551234', email: 'tampa@x.com' } });
    await POST(makePostReq({ city: 'Tampa', state: 'FL', isPrimary: true }));

    const unsetOthers = calls.find(c => c.table === 'dealer_locations' && c.op === 'update' && c.payload.is_primary === false);
    expect(unsetOthers).toBeTruthy();

    const dealerMirror = calls.find(c => c.table === 'dealers' && c.op === 'update');
    expect(dealerMirror!.payload).toMatchObject({ location: 'Tampa', state: 'FL', address: '123 Main St' });
  });
});

describe('PATCH /api/dealer/locations', () => {
  it('returns 404 when the location does not belong to this dealer', async () => {
    makeFromMock({ ownershipCheck: null });
    const res: any = await PATCH(makePostReq({ id: 'loc-1', city: 'Tampa' }));
    expect(res._status).toBe(404);
  });

  it('updates fields and mirrors the primary location afterward', async () => {
    const calls = makeFromMock({ primaryLocation: { address: null, city: 'Atlanta', state: 'GA', zip: null, phone: null, email: null } });
    const res: any = await PATCH(makePostReq({ id: 'loc-1', city: 'Atlanta', isPrimary: true }));
    expect(res._status).toBe(200);
    const update = calls.find(c => c.op === 'update' && c.table === 'dealer_locations' && c.payload.city === 'Atlanta');
    expect(update).toBeTruthy();
    expect(calls.some(c => c.table === 'dealers' && c.op === 'update')).toBe(true);
  });
});

describe('DELETE /api/dealer/locations', () => {
  it('returns 404 when the location does not belong to this dealer', async () => {
    makeFromMock({ ownershipCheck: null });
    const res: any = await DELETE(makeDeleteReq('loc-1'));
    expect(res._status).toBe(404);
  });

  it('deletes a location the dealer owns', async () => {
    const calls = makeFromMock({});
    const res: any = await DELETE(makeDeleteReq('loc-1'));
    expect(res._status).toBe(200);
    expect(calls.some(c => c.table === 'dealer_locations' && c.op === 'delete')).toBe(true);
  });
});
