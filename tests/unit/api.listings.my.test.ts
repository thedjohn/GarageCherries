import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mocks ────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser:  vi.fn(),
  mockFrom:     vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      _data: data,
      _status: init?.status ?? 200,
      json: async () => data,
    })),
  },
}));

import { GET } from '@/app/api/listings/my/route';
import { NextResponse } from 'next/server';

// ── Helpers ───────────────────────────────────────────────────────────────────

// resolveDealerId() always checks `dealers` then `dealer_members` before the
// real listings query -- neither table is exercised by these tests (they're
// all private-seller scenarios), so both consistently miss, matching the
// pre-existing "query by the caller's own id" behavior exactly.
function mockChain(result: { data: unknown; error: unknown }) {
  const selectCalls: any[] = [];
  const eqCalls: any[] = [];
  let orderMock: ReturnType<typeof vi.fn> | undefined;

  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers' || table === 'dealer_members') {
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    }
    return {
      select: (cols: string) => {
        selectCalls.push(cols);
        return {
          eq: (...args: unknown[]) => {
            eqCalls.push(args);
            orderMock = vi.fn().mockResolvedValue(result);
            return { order: orderMock };
          },
        };
      },
    };
  });

  return { selectCalls, eqCalls, getOrderMock: () => orderMock };
}

function getResponse(call = 0) {
  return (NextResponse.json as ReturnType<typeof vi.fn>).mock.results[call].value;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/listings/my', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await GET();
    const res = getResponse();
    expect(res._status).toBe(401);
    expect(res._data).toMatchObject({ error: 'Not logged in' });
  });

  it('returns listings array for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const listings = [{ id: 'l1', title: '2002 Dodge Ram', fuel_type: 'Gasoline', interior_color: 'Black', seat_material: 'Cloth' }];
    mockChain({ data: listings, error: null });

    await GET();

    const res = getResponse();
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ listings });
  });

  it('queries by seller_id, falling back to the caller\'s own id when not a dealer or team member', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-42' } } });
    const { eqCalls } = mockChain({ data: [], error: null });

    await GET();

    expect(eqCalls).toContainEqual(['seller_id', 'user-42']);
  });

  it('selects fuel_type, interior_color, and seat_material', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { selectCalls } = mockChain({ data: [], error: null });

    await GET();

    const selectArg = selectCalls.find(c => typeof c === 'string' && c.includes('fuel_type'));
    expect(selectArg).toContain('fuel_type');
    expect(selectArg).toContain('interior_color');
    expect(selectArg).toContain('seat_material');
  });

  it('orders by created_at descending', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { getOrderMock } = mockChain({ data: [], error: null });

    await GET();

    expect(getOrderMock()).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('returns empty array when user has no listings', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockChain({ data: null, error: null });

    await GET();

    const res = getResponse();
    expect(res._data).toEqual({ listings: [] });
  });

  it('returns 500 on database error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockChain({ data: null, error: { message: 'DB connection failed' } });

    await GET();

    const res = getResponse();
    expect(res._status).toBe(500);
    expect(res._data).toMatchObject({ error: 'DB connection failed' });
  });
});
