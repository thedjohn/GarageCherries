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
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), flush: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { POST, DELETE } from '@/app/api/dealer/feed-sftp/provision/route';

function makeReq() {
  return {} as unknown as NextRequest;
}

const DEALER_ID = 'dealer-1';

function makeFromMock(dealerLookup: any, updateCalls: any[] = []) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') {
      return {
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: dealerLookup }) }) }),
        update: (payload: any) => { updateCalls.push(payload); return { eq: () => Promise.resolve({ error: null }) }; },
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
  mockGetUser.mockResolvedValue({ data: { user: { id: DEALER_ID } } });
  process.env.VPS_URL = 'https://video.garagecherries.com';
  process.env.VPS_SFTP_BRIDGE_SECRET = 'bridge-secret';
});

describe('POST /api/dealer/feed-sftp/provision', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await POST(makeReq());
    expect(res._status).toBe(401);
  });

  it('returns 403 when the authenticated user has no dealer account', async () => {
    makeFromMock(null);
    const res: any = await POST(makeReq());
    expect(res._status).toBe(403);
  });

  it('returns 503 when the VPS bridge is not configured', async () => {
    delete process.env.VPS_URL;
    makeFromMock({ id: DEALER_ID });
    const res: any = await POST(makeReq());
    expect(res._status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('provisions via the VPS bridge and stamps the dealer row, never storing the password', async () => {
    const updateCalls: any[] = [];
    makeFromMock({ id: DEALER_ID }, updateCalls);
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ username: 'dealer_dealer-1', password: 'one-time-pw', host: 'video.garagecherries.com', port: 2022 }),
    });

    const res: any = await POST(makeReq());

    expect(fetch).toHaveBeenCalledWith('https://video.garagecherries.com/dealer-feed/dealers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bridge-secret' },
      body: JSON.stringify({ dealerId: DEALER_ID }),
    });
    expect(updateCalls[0]).toEqual({
      feed_protocol: 'sftp_incoming',
      feed_sftp_username: 'dealer_dealer-1',
      feed_sftp_provisioned_at: expect.any(String),
    });
    expect(updateCalls[0]).not.toHaveProperty('password');
    expect(res._status).toBe(200);
    expect(res._data).toEqual({ username: 'dealer_dealer-1', password: 'one-time-pw', host: 'video.garagecherries.com', port: 2022 });
  });

  it('best-effort deletes any existing account before provisioning, so regenerating an already-provisioned dealer succeeds instead of colliding', async () => {
    const updateCalls: any[] = [];
    makeFromMock({ id: DEALER_ID }, updateCalls);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'user already exists' }) // pre-delete call, deliberately failing
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'dealer_dealer-1', password: 'new-pw', host: 'video.garagecherries.com', port: 2022 }) });
    vi.stubGlobal('fetch', fetchMock);

    const res: any = await POST(makeReq());

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://video.garagecherries.com/dealer-feed/dealers/dealer-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer bridge-secret' },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://video.garagecherries.com/dealer-feed/dealers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer bridge-secret' },
      body: JSON.stringify({ dealerId: DEALER_ID }),
    });
    expect(res._status).toBe(200);
    expect(res._data.username).toBe('dealer_dealer-1');
  });

  it('does not let a network-level failure of the pre-delete call block provisioning', async () => {
    makeFromMock({ id: DEALER_ID });
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network down')) // pre-delete call throws outright
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'dealer_dealer-1', password: 'new-pw', host: 'video.garagecherries.com', port: 2022 }) });
    vi.stubGlobal('fetch', fetchMock);

    const res: any = await POST(makeReq());
    expect(res._status).toBe(200);
  });

  it('returns 502 without writing to the dealer row when the bridge call fails', async () => {
    const updateCalls: any[] = [];
    makeFromMock({ id: DEALER_ID }, updateCalls);
    (fetch as any).mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    const res: any = await POST(makeReq());
    expect(res._status).toBe(502);
    expect(updateCalls).toHaveLength(0);
  });

  it('still returns 502 cleanly even if the failed response body cannot be read', async () => {
    makeFromMock({ id: DEALER_ID });
    (fetch as any).mockResolvedValue({ ok: false, status: 500, text: () => Promise.reject(new Error('stream error')) });

    const res: any = await POST(makeReq());
    expect(res._status).toBe(502);
  });
});

describe('DELETE /api/dealer/feed-sftp/provision', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res: any = await DELETE(makeReq());
    expect(res._status).toBe(401);
  });

  it('calls the bridge to deprovision and clears all SFTP fields on the dealer row', async () => {
    const updateCalls: any[] = [];
    makeFromMock({ id: DEALER_ID }, updateCalls);
    (fetch as any).mockResolvedValue({ ok: true });

    const res: any = await DELETE(makeReq());

    expect(fetch).toHaveBeenCalledWith('https://video.garagecherries.com/dealer-feed/dealers/dealer-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer bridge-secret' },
    });
    expect(updateCalls[0]).toEqual({
      feed_protocol: null,
      feed_sftp_username: null,
      feed_sftp_provisioned_at: null,
      feed_sftp_last_received_at: null,
    });
    expect(res._data).toEqual({ ok: true });
  });

  it('returns 502 without clearing the dealer row when the bridge call fails', async () => {
    const updateCalls: any[] = [];
    makeFromMock({ id: DEALER_ID }, updateCalls);
    (fetch as any).mockResolvedValue({ ok: false, status: 500, text: async () => 'boom' });

    const res: any = await DELETE(makeReq());
    expect(res._status).toBe(502);
    expect(updateCalls).toHaveLength(0);
  });

  it('still returns 502 cleanly even if the failed response body cannot be read', async () => {
    makeFromMock({ id: DEALER_ID });
    (fetch as any).mockResolvedValue({ ok: false, status: 500, text: () => Promise.reject(new Error('stream error')) });

    const res: any = await DELETE(makeReq());
    expect(res._status).toBe(502);
  });

  it('still clears the dealer row when the VPS bridge is unconfigured (nothing to deprovision remotely)', async () => {
    delete process.env.VPS_URL;
    const updateCalls: any[] = [];
    makeFromMock({ id: DEALER_ID }, updateCalls);

    const res: any = await DELETE(makeReq());
    expect(fetch).not.toHaveBeenCalled();
    expect(updateCalls).toHaveLength(1);
    expect(res._data).toEqual({ ok: true });
  });
});
