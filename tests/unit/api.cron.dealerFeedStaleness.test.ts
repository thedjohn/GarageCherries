import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockNotifyAdmin, mockLoggerInfo, mockLoggerWarn, mockLoggerFlush } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockNotifyAdmin: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerFlush: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: mockLoggerWarn, error: vi.fn(), flush: mockLoggerFlush }),
}));
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ _data: data, _status: init?.status ?? 200 })),
  },
}));

import { GET } from '@/app/api/cron/dealer-feed-staleness/route';

function makeRequest(authHeader?: string) {
  return { headers: { get: (k: string) => (k === 'Authorization' ? authHeader ?? null : null) } } as unknown as NextRequest;
}

function makeDealersMock(rows: any[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') {
      return { select: () => ({ eq: () => Promise.resolve({ data: rows }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

const HOUR = 60 * 60 * 1000;
const now = Date.now();

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = 'cron-secret';
});

describe('GET /api/cron/dealer-feed-staleness', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    const res: any = await GET(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('passes cleanly when no sftp_incoming dealers exist', async () => {
    makeDealersMock([]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, checkedCount: 0, staleCount: 0 });
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it('does not flag a dealer who received a file recently', async () => {
    makeDealersMock([{
      id: 'd1', name: 'Fresh Motors', email: 'fresh@dealer.com',
      feed_sftp_provisioned_at: new Date(now - 72 * HOUR).toISOString(),
      feed_sftp_last_received_at: new Date(now - 2 * HOUR).toISOString(),
    }]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.staleCount).toBe(0);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it('flags a dealer whose last received file is more than 48 hours old', async () => {
    makeDealersMock([{
      id: 'd1', name: 'Stale Motors', email: 'stale@dealer.com',
      feed_sftp_provisioned_at: new Date(now - 200 * HOUR).toISOString(),
      feed_sftp_last_received_at: new Date(now - 50 * HOUR).toISOString(),
    }]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.staleCount).toBe(1);
    expect(res._data.ok).toBe(false);
    expect(mockNotifyAdmin).toHaveBeenCalledWith('Dealer SFTP feeds gone stale', expect.stringContaining('Stale Motors'));
  });

  it('does not flag a dealer who provisioned recently but has not received a file yet (grace period)', async () => {
    makeDealersMock([{
      id: 'd1', name: 'New Motors', email: 'new@dealer.com',
      feed_sftp_provisioned_at: new Date(now - 1 * HOUR).toISOString(),
      feed_sftp_last_received_at: null,
    }]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.staleCount).toBe(0);
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
  });

  it('flags a dealer who provisioned over 48 hours ago and has never received a file', async () => {
    makeDealersMock([{
      id: 'd1', name: 'Ghost Motors', email: 'ghost@dealer.com',
      feed_sftp_provisioned_at: new Date(now - 60 * HOUR).toISOString(),
      feed_sftp_last_received_at: null,
    }]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.staleCount).toBe(1);
    expect(mockNotifyAdmin).toHaveBeenCalledWith('Dealer SFTP feeds gone stale', expect.stringContaining('never received a file'));
  });

  it('checks multiple dealers independently and only reports the stale ones', async () => {
    makeDealersMock([
      { id: 'd1', name: 'Fresh Motors', email: 'fresh@dealer.com', feed_sftp_provisioned_at: new Date(now - 200 * HOUR).toISOString(), feed_sftp_last_received_at: new Date(now - 1 * HOUR).toISOString() },
      { id: 'd2', name: 'Stale Motors', email: 'stale@dealer.com', feed_sftp_provisioned_at: new Date(now - 200 * HOUR).toISOString(), feed_sftp_last_received_at: new Date(now - 100 * HOUR).toISOString() },
    ]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.checkedCount).toBe(2);
    expect(res._data.staleCount).toBe(1);
    expect(mockNotifyAdmin).toHaveBeenCalledWith('Dealer SFTP feeds gone stale', expect.stringContaining('Stale Motors'));
    const [, body] = mockNotifyAdmin.mock.calls[0];
    expect(body).not.toContain('Fresh Motors');
  });
});
