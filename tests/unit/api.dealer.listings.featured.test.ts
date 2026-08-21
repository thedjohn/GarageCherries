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

import { POST } from '@/app/api/dealer/listings/[id]/featured/route';

function makeReq(body: unknown) {
  return { json: async () => body } as unknown as NextRequest;
}
function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

// listings.select() is called with three different column/shape combos in this
// route: the ownership lookup ('seller_id, featured'), the active-listing count,
// and the featured-listing count. The two count queries share the same 'id'
// column argument, so they're distinguished here by call order rather than shape.
function makeFromMock(opts: {
  listing?: any;
  activeCount?: number | null;
  featuredCount?: number | null;
  updateError?: { message: string } | null;
}) {
  const listing = opts.listing !== undefined ? opts.listing : { seller_id: 'dealer-1', featured: false };
  const calls: { op: string; payload?: any }[] = [];
  let countCallIndex = 0;

  function countChain(count: number | null) {
    const p: any = Promise.resolve({ count, error: null });
    p.eq = () => p;
    p.or = () => p;
    return p;
  }

  mockFrom.mockImplementation((table: string) => {
    if (table !== 'listings') throw new Error(`Unexpected table: ${table}`);
    return {
      select: (cols: string) => {
        if (cols === 'seller_id, featured') {
          return { eq: () => ({ single: () => Promise.resolve({ data: listing }) }) };
        }
        countCallIndex++;
        const count = countCallIndex === 1 ? (opts.activeCount ?? 0) : (opts.featuredCount ?? 0);
        return countChain(count);
      },
      update: (payload: any) => {
        calls.push({ op: 'update', payload });
        return { eq: () => Promise.resolve({ error: opts.updateError ?? null }) };
      },
    };
  });

  return calls;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'dealer-1' } } });
});

describe('POST /api/dealer/listings/[id]/featured', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    makeFromMock({});
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(401);
  });

  it('returns 400 when featured is not a boolean', async () => {
    makeFromMock({});
    const res: any = await POST(makeReq({ featured: 'yes' }), makeParams('l1'));
    expect(res._status).toBe(400);
  });

  it('returns 404 when the listing does not exist', async () => {
    makeFromMock({ listing: null });
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(404);
  });

  it("returns 404 when the listing belongs to a different seller", async () => {
    makeFromMock({ listing: { seller_id: 'someone-else', featured: false } });
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(404);
  });

  it('unfeatures a listing without any cap check', async () => {
    const calls = makeFromMock({ listing: { seller_id: 'dealer-1', featured: true } });
    const res: any = await POST(makeReq({ featured: false }), makeParams('l1'));
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ success: true });
    expect(calls[0].payload).toEqual({ featured: false });
  });

  it('re-featuring an already-featured listing skips the cap check', async () => {
    // activeCount/featuredCount left undefined on purpose -- if the route read
    // them it would use the `?? 0` fallback and still pass, so instead assert
    // the count queries were never reached at all.
    makeFromMock({ listing: { seller_id: 'dealer-1', featured: true } });
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(200);
    expect(mockFrom).toHaveBeenCalledTimes(2); // ownership lookup + update, no count queries
  });

  it('blocks featuring entirely at the 0-featured tier (5 or fewer active listings)', async () => {
    makeFromMock({ activeCount: 5, featuredCount: 0 });
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(403);
    expect(res._data.error).toMatch(/aren.t available/i);
  });

  it('blocks featuring once the mid tier cap (3) is already used', async () => {
    makeFromMock({ activeCount: 25, featuredCount: 3 });
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(403);
    expect(res._data.error).toBe('You can feature up to 3 listings at a time. Unfeature another listing first.');
  });

  it('allows featuring under the mid tier cap and applies the update', async () => {
    const calls = makeFromMock({ activeCount: 25, featuredCount: 2 });
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(200);
    expect(calls[0].payload).toEqual({ featured: true });
  });

  it('grants the top tier (10) once active listings exceed 25', async () => {
    makeFromMock({ activeCount: 26, featuredCount: 9 });
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(200);
  });

  it('blocks at the top tier cap (10) once reached', async () => {
    makeFromMock({ activeCount: 26, featuredCount: 10 });
    const res: any = await POST(makeReq({ featured: true }), makeParams('l1'));
    expect(res._status).toBe(403);
    expect(res._data.error).toBe('You can feature up to 10 listings at a time. Unfeature another listing first.');
  });

  it('returns 500 when the update fails', async () => {
    makeFromMock({ listing: { seller_id: 'dealer-1', featured: true }, updateError: { message: 'db down' } });
    const res: any = await POST(makeReq({ featured: false }), makeParams('l1'));
    expect(res._status).toBe(500);
    expect(res._data.error).toBe('db down');
  });
});
