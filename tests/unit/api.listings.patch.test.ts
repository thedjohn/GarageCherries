import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mocks ────────────────────────────────────────────────────────────

const {
  mockGetUser, mockFrom, mockSelect, mockSingle,
  mockUpdate, mockEq, mockRpc,
} = vi.hoisted(() => ({
  mockGetUser:  vi.fn(),
  mockFrom:     vi.fn(),
  mockSelect:   vi.fn(),
  mockSingle:   vi.fn(),
  mockUpdate:   vi.fn(),
  mockEq:       vi.fn(),
  mockRpc:      vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      _data: data,
      _status: init?.status ?? 200,
    })),
  },
}));

import { PATCH } from '@/app/api/listings/[id]/route';
import { NextResponse } from 'next/server';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as Request;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function setupListing(listing: Record<string, unknown> | null, ownerId = 'user-1') {
  mockGetUser.mockResolvedValue({ data: { user: { id: ownerId } } });

  // suspended_users check → no suspension
  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'suspended_users') {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
    }
    if (table === 'dealers') {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
    }
    if (table === 'listings') {
      callCount++;
      if (callCount === 1) {
        // ownership select
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: listing }),
            }),
          }),
        };
      }
      // update call
      return {
        update: mockUpdate,
      };
    }
    if (table === 'price_history') {
      return { insert: vi.fn().mockResolvedValue({}) };
    }
    return {};
  });

  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
}

function getResponse(call = 0) {
  return (NextResponse.json as ReturnType<typeof vi.fn>).mock.results[call].value;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/listings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BETA_MODE = 'true'; // skip dealer beta check
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await PATCH(makeRequest({}), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(401);
  });

  it('returns 404 when listing not found', async () => {
    setupListing(null);
    await PATCH(makeRequest({ price: 5000 }), makeParams('bad-id'));
    const res = getResponse();
    expect(res._status).toBe(404);
  });

  it('returns 404 when listing belongs to another user', async () => {
    setupListing({ seller_id: 'other-user', status: 'approved', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' }, 'user-1');
    await PATCH(makeRequest({ price: 4000 }), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(404);
  });

  it('returns 200 on successful update', async () => {
    setupListing({ seller_id: 'user-1', status: 'pending', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    await PATCH(makeRequest({ price: 4500 }), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(200);
    expect(res._data).toMatchObject({ success: true });
  });

  it('accepts interior_color and seat_material', async () => {
    setupListing({ seller_id: 'user-1', status: 'pending', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    await PATCH(
      makeRequest({ interior_color: 'Black', seat_material: 'Leather' }),
      makeParams('listing-1'),
    );
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg).toMatchObject({ interior_color: 'Black', seat_material: 'Leather' });
  });

  it('accepts all new vehicle fields', async () => {
    setupListing({ seller_id: 'user-1', status: 'pending', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    await PATCH(
      makeRequest({ year: 2003, make: 'Ford', model: 'F-150', body_style: 'Pickup Truck', condition: 'Good', fuel_type: 'Gasoline', engine: '5.4 V8', transmission: 'Automatic', color: 'Blue', city: 'Nashville', state: 'TN' }),
      makeParams('listing-1'),
    );
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg).toMatchObject({
      year: 2003, make: 'Ford', model: 'F-150',
      body_style: 'Pickup Truck', condition: 'Good',
      fuel_type: 'Gasoline', engine: '5.4 V8',
      transmission: 'Automatic', color: 'Blue',
      location: 'Nashville', state: 'TN',
    });
  });

  it('regenerates title when year/make/model change', async () => {
    setupListing({ seller_id: 'user-1', status: 'pending', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    await PATCH(
      makeRequest({ year: 2003, make: 'Ford', model: 'Mustang' }),
      makeParams('listing-1'),
    );
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.title).toBe('2003 Ford Mustang');
  });

  it('transitions approved listing to pending on any edit', async () => {
    setupListing({ seller_id: 'user-1', status: 'approved', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    await PATCH(makeRequest({ price: 4000 }), makeParams('listing-1'));
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.status).toBe('pending');
  });

  it('transitions rejected listing to pending with resubmission_note', async () => {
    setupListing({ seller_id: 'user-1', status: 'rejected', resubmission_count: 1, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    await PATCH(makeRequest({ price: 4000, resubmission_note: 'Fixed photos' }), makeParams('listing-1'));
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.status).toBe('pending');
    expect(updateArg.resubmission_note).toBe('Fixed photos');
    expect(updateArg.rejection_reason).toBeNull();
  });

  it('blocks rejected listing resubmission without resubmission_note', async () => {
    setupListing({ seller_id: 'user-1', status: 'rejected', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    await PATCH(makeRequest({ price: 4000 }), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(400);
  });

  it('clears null color and interior_color', async () => {
    setupListing({ seller_id: 'user-1', status: 'pending', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    await PATCH(makeRequest({ color: '', interior_color: '' }), makeParams('listing-1'));
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.color).toBeNull();
    expect(updateArg.interior_color).toBeNull();
  });
});
