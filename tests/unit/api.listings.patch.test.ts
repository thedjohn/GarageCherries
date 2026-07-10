import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Supabase mocks ────────────────────────────────────────────────────────────

const {
  mockGetUser, mockFrom, mockSelect, mockSingle,
  mockUpdate, mockEq, mockRpc, mockStorageRemove,
} = vi.hoisted(() => ({
  mockGetUser:  vi.fn(),
  mockFrom:     vi.fn(),
  mockSelect:   vi.fn(),
  mockSingle:   vi.fn(),
  mockUpdate:   vi.fn(),
  mockEq:       vi.fn(),
  mockRpc:      vi.fn(),
  mockStorageRemove: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
    storage: { from: vi.fn(() => ({ remove: mockStorageRemove })) },
  })),
}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      _data: data,
      _status: init?.status ?? 200,
    })),
  },
}));

import { PATCH, DELETE } from '@/app/api/listings/[id]/route';
import { NextResponse } from 'next/server';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
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

  it('returns 403 when the seller is suspended', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'user-1' } }) }) }) };
      }
      return {};
    });
    await PATCH(makeRequest({ price: 1000 }), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(403);
  });

  it('returns 403 BETA_EXPIRED when the dealer beta period has ended (BETA_MODE off)', async () => {
    delete process.env.BETA_MODE;
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      }
      if (table === 'dealers') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { beta_expires_at: '2020-01-01T00:00:00Z' } }) }) }) };
      }
      return {};
    });
    await PATCH(makeRequest({ price: 1000 }), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(403);
    expect(res._data.error).toBe('BETA_EXPIRED');
  });

  it('proceeds normally when BETA_MODE is off but the dealer beta has not expired', async () => {
    delete process.env.BETA_MODE;
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    let listingsCall = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      }
      if (table === 'dealers') {
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: { beta_expires_at: '2099-01-01T00:00:00Z' } }) }) }) };
      }
      if (table === 'listings') {
        listingsCall++;
        if (listingsCall === 1) {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-1', status: 'pending', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' } }) }) }) };
        }
        return { update: mockUpdate };
      }
      return {};
    });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

    await PATCH(makeRequest({ description: 'Updated description' }), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(200);
  });

  it('returns 500 when the update fails', async () => {
    setupListing({ seller_id: 'user-1', status: 'pending', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: { message: 'db down' } }) });
    await PATCH(makeRequest({ price: 4000 }), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(500);
  });

  it('records price_history and notifies watchers on a price drop', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const insert = vi.fn().mockResolvedValue({});
    let listingsCall = 0;
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'suspended_users') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'dealers') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) }) }) };
      if (table === 'price_history') return { insert };
      if (table === 'listings') {
        listingsCall++;
        if (listingsCall === 1) {
          return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-1', status: 'approved', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' } }) }) }) };
        }
        return { update: mockUpdate };
      }
      return {};
    });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    process.env.BETA_MODE = 'true';

    await PATCH(makeRequest({ price: 4000 }), makeParams('listing-1'));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ car_id: 'listing-1', old_price: 5000, price: 4000 }));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/notify-watchers'), expect.objectContaining({ method: 'POST' }));
  });

  it('does not record price_history when the new price is not lower', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const insert = vi.fn();
    setupListing({ seller_id: 'user-1', status: 'pending', resubmission_count: 0, price: 5000, year: 2002, make: 'Dodge', model: 'Ram' });
    const originalFrom = mockFrom.getMockImplementation()!;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'price_history') return { insert };
      return originalFrom(table);
    });

    await PATCH(makeRequest({ price: 6000 }), makeParams('listing-1'));
    expect(insert).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ── DELETE /api/listings/[id] ────────────────────────────────────────────────

describe('DELETE /api/listings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not logged in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await DELETE(makeRequest({}), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(401);
  });

  it('returns 404 when the listing does not exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) };
      return {};
    });
    await DELETE(makeRequest({}), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(404);
  });

  it('returns 404 when the listing belongs to another user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'other-user', images: [] } }) }) }) };
      return {};
    });
    await DELETE(makeRequest({}), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(404);
  });

  it('removes storage images, deletes conversations, and deletes the listing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-1', images: ['https://x.supabase.co/storage/v1/object/public/listing-images/cars/private/a.jpg'] } }) }) }),
          delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    });

    await DELETE(makeRequest({}), makeParams('listing-1'));
    const res = getResponse();
    expect(mockStorageRemove).toHaveBeenCalled();
    expect(res._data.success).toBe(true);
  });

  it('skips storage cleanup when there are no images', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-1', images: [] } }) }) }),
          delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    });

    await DELETE(makeRequest({}), makeParams('listing-1'));
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it('returns 500 when the delete fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const deleteEq = vi.fn().mockResolvedValue({ error: { message: 'db down' } });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'listings') {
        return {
          select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { seller_id: 'user-1', images: [] } }) }) }),
          delete: vi.fn().mockReturnValue({ eq: deleteEq }),
        };
      }
      return { delete: vi.fn().mockReturnValue({ eq: deleteEq }) };
    });

    await DELETE(makeRequest({}), makeParams('listing-1'));
    const res = getResponse();
    expect(res._status).toBe(500);
  });
});
