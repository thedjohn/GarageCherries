import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET } from '@/app/api/tiktok/oauth/callback/route';

function makeReq(url: string) {
  return { nextUrl: new URL(url) } as unknown as NextRequest;
}

const BASE = 'https://www.garagecherries.com/api/tiktok/oauth/callback';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
  process.env.TIKTOK_CLIENT_KEY = 'client-key';
  process.env.TIKTOK_CLIENT_SECRET = 'client-secret';
});

describe('GET /api/tiktok/oauth/callback', () => {
  it('returns 400 when TikTok reports an error', async () => {
    const res: any = await GET(makeReq(`${BASE}?error=access_denied&error_description=user+cancelled`));
    expect(res._status).toBe(400);
    expect(res._data).toEqual({ error: 'access_denied', error_description: 'user cancelled' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns 400 when code is missing', async () => {
    const res: any = await GET(makeReq(`${BASE}?state=verifier`));
    expect(res._status).toBe(400);
  });

  it('returns 400 when state (code_verifier) is missing', async () => {
    const res: any = await GET(makeReq(`${BASE}?code=abc`));
    expect(res._status).toBe(400);
  });

  it('returns 500 when TikTok credentials are not configured', async () => {
    delete process.env.TIKTOK_CLIENT_KEY;
    const res: any = await GET(makeReq(`${BASE}?code=abc&state=verifier`));
    expect(res._status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('exchanges the code for tokens and returns them on success', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'at', refresh_token: 'rt', open_id: 'oid', expires_in: 86400, refresh_expires_in: 31536000 }),
    });

    const res: any = await GET(makeReq(`${BASE}?code=abc&state=verifier`));

    expect(fetch).toHaveBeenCalledWith('https://open.tiktokapis.com/v2/oauth/token/', expect.objectContaining({
      method: 'POST',
    }));
    const body = (fetch as any).mock.calls[0][1].body as URLSearchParams;
    expect(body.get('client_key')).toBe('client-key');
    expect(body.get('client_secret')).toBe('client-secret');
    expect(body.get('code')).toBe('abc');
    expect(body.get('code_verifier')).toBe('verifier');
    expect(body.get('redirect_uri')).toBe(BASE);

    expect(res._status).toBe(200);
    expect(res._data).toEqual({ access_token: 'at', refresh_token: 'rt', open_id: 'oid', expires_in: 86400, refresh_expires_in: 31536000 });
  });

  it('returns 502 when the token exchange response is not ok', async () => {
    (fetch as any).mockResolvedValue({ ok: false, json: async () => ({ error: 'invalid_grant' }) });

    const res: any = await GET(makeReq(`${BASE}?code=abc&state=verifier`));
    expect(res._status).toBe(502);
  });

  it('returns 502 when the token exchange response is ok but contains an error field', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ error: 'invalid_client', error_description: 'bad secret' }) });

    const res: any = await GET(makeReq(`${BASE}?code=abc&state=verifier`));
    expect(res._status).toBe(502);
  });
});
