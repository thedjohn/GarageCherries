import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockInsert } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST } from '@/app/api/dealer/track-click/route';

function makeRequest(body: Record<string, unknown>) {
  return { json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
  mockFrom.mockReturnValue({ insert: mockInsert });
});

describe('POST /api/dealer/track-click', () => {
  it('records a website click tied to a listing', async () => {
    const res: any = await POST(makeRequest({ dealerId: 'dealer-1', listingId: 'listing-1', clickType: 'website' }));
    expect(mockFrom).toHaveBeenCalledWith('dealer_link_clicks');
    expect(mockInsert).toHaveBeenCalledWith({ dealer_id: 'dealer-1', listing_id: 'listing-1', click_type: 'website' });
    expect(res._data).toEqual({ ok: true });
  });

  it('records a phone click with no listing (e.g. from the dealer directory page)', async () => {
    const res: any = await POST(makeRequest({ dealerId: 'dealer-1', clickType: 'phone' }));
    expect(mockInsert).toHaveBeenCalledWith({ dealer_id: 'dealer-1', listing_id: null, click_type: 'phone' });
    expect(res._data).toEqual({ ok: true });
  });

  it('rejects with ok:false when dealerId is missing, without touching the database', async () => {
    const res: any = await POST(makeRequest({ clickType: 'website' }));
    expect(mockFrom).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: false });
  });

  it('rejects with ok:false when clickType is not website or phone', async () => {
    const res: any = await POST(makeRequest({ dealerId: 'dealer-1', clickType: 'email' }));
    expect(mockFrom).not.toHaveBeenCalled();
    expect(res._data).toEqual({ ok: false });
  });
});
