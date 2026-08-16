import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

const { mockFrom, mockNotifyAdmin, mockLoggerInfo, mockLoggerWarn, mockLoggerError, mockLoggerFlush, mockSend } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockNotifyAdmin: vi.fn(),
  mockLoggerInfo: vi.fn(),
  mockLoggerWarn: vi.fn(),
  mockLoggerError: vi.fn(),
  mockLoggerFlush: vi.fn().mockResolvedValue(undefined),
  mockSend: vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/notifyAdmin', () => ({ notifyAdmin: mockNotifyAdmin }));
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: mockLoggerInfo, warn: mockLoggerWarn, error: mockLoggerError, flush: mockLoggerFlush }),
}));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));
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
      return { select: () => ({ or: () => Promise.resolve({ data: rows }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

const HOUR = 60 * 60 * 1000;
const now = Date.now();

beforeEach(() => {
  vi.clearAllMocks();
  mockSend.mockResolvedValue({ data: { id: 'email-1' }, error: null });
  process.env.CRON_SECRET = 'cron-secret';
});

describe('GET /api/cron/dealer-feed-staleness', () => {
  it('returns 401 without the correct CRON_SECRET', async () => {
    const res: any = await GET(makeRequest('Bearer wrong'));
    expect(res._status).toBe(401);
  });

  it('passes cleanly when no feed dealers exist', async () => {
    makeDealersMock([]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data).toEqual({ ok: true, checkedCount: 0, staleCount: 0 });
    expect(mockNotifyAdmin).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  describe('sftp_incoming (push) dealers', () => {
    it('does not flag a dealer who received a file recently', async () => {
      makeDealersMock([{
        id: 'd1', name: 'Fresh Motors', email: 'fresh@dealer.com', feed_protocol: 'sftp_incoming',
        feed_sftp_provisioned_at: new Date(now - 72 * HOUR).toISOString(),
        feed_sftp_last_received_at: new Date(now - 2 * HOUR).toISOString(),
        feed_last_success_at: null,
      }]);
      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.staleCount).toBe(0);
      expect(mockNotifyAdmin).not.toHaveBeenCalled();
    });

    it('flags a dealer whose last received file is more than 48 hours old, and emails them', async () => {
      makeDealersMock([{
        id: 'd1', name: 'Stale Motors', email: 'stale@dealer.com', feed_protocol: 'sftp_incoming',
        feed_sftp_provisioned_at: new Date(now - 200 * HOUR).toISOString(),
        feed_sftp_last_received_at: new Date(now - 50 * HOUR).toISOString(),
        feed_last_success_at: null,
      }]);
      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.staleCount).toBe(1);
      expect(res._data.ok).toBe(false);
      expect(mockNotifyAdmin).toHaveBeenCalledWith('Dealer feeds gone stale', expect.stringContaining('Stale Motors'));
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'stale@dealer.com' }));
    });

    it('does not flag a dealer who provisioned recently but has not received a file yet (grace period)', async () => {
      makeDealersMock([{
        id: 'd1', name: 'New Motors', email: 'new@dealer.com', feed_protocol: 'sftp_incoming',
        feed_sftp_provisioned_at: new Date(now - 1 * HOUR).toISOString(),
        feed_sftp_last_received_at: null, feed_last_success_at: null,
      }]);
      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.staleCount).toBe(0);
      expect(mockNotifyAdmin).not.toHaveBeenCalled();
    });

    it('flags a dealer who provisioned over 48 hours ago and has never received a file', async () => {
      makeDealersMock([{
        id: 'd1', name: 'Ghost Motors', email: 'ghost@dealer.com', feed_protocol: 'sftp_incoming',
        feed_sftp_provisioned_at: new Date(now - 60 * HOUR).toISOString(),
        feed_sftp_last_received_at: null, feed_last_success_at: null,
      }]);
      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.staleCount).toBe(1);
      expect(mockNotifyAdmin).toHaveBeenCalledWith('Dealer feeds gone stale', expect.stringContaining('never received a file'));
    });
  });

  describe('https / outbound-sftp (pull) dealers', () => {
    it('does not flag a dealer who last succeeded recently', async () => {
      makeDealersMock([{
        id: 'd1', name: 'Fresh Pull Motors', email: 'freshpull@dealer.com', feed_protocol: 'https',
        feed_sftp_provisioned_at: null, feed_sftp_last_received_at: null,
        feed_last_success_at: new Date(now - 3 * HOUR).toISOString(),
      }]);
      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.staleCount).toBe(0);
    });

    it('flags an https dealer whose last successful sync is more than 48 hours old, and emails them', async () => {
      makeDealersMock([{
        id: 'd1', name: 'Stale Pull Motors', email: 'stalepull@dealer.com', feed_protocol: 'https',
        feed_sftp_provisioned_at: null, feed_sftp_last_received_at: null,
        feed_last_success_at: new Date(now - 90 * HOUR).toISOString(),
      }]);
      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.staleCount).toBe(1);
      expect(mockNotifyAdmin).toHaveBeenCalledWith('Dealer feeds gone stale', expect.stringContaining('Stale Pull Motors'));
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'stalepull@dealer.com' }));
    });

    it('flags a stale outbound-sftp dealer the same way as https', async () => {
      makeDealersMock([{
        id: 'd1', name: 'Stale SFTP Motors', email: 'stalesftp@dealer.com', feed_protocol: 'sftp',
        feed_sftp_provisioned_at: null, feed_sftp_last_received_at: null,
        feed_last_success_at: new Date(now - 60 * HOUR).toISOString(),
      }]);
      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.staleCount).toBe(1);
    });

    it('does not flag a pull dealer who has never once synced successfully (setup problem, not staleness)', async () => {
      makeDealersMock([{
        id: 'd1', name: 'Never Synced Motors', email: 'never@dealer.com', feed_protocol: 'https',
        feed_sftp_provisioned_at: null, feed_sftp_last_received_at: null,
        feed_last_success_at: null,
      }]);
      const res: any = await GET(makeRequest('Bearer cron-secret'));
      expect(res._data.staleCount).toBe(0);
      expect(mockNotifyAdmin).not.toHaveBeenCalled();
    });
  });

  it('checks multiple dealers across protocols independently and only reports/emails the stale ones', async () => {
    makeDealersMock([
      { id: 'd1', name: 'Fresh Motors', email: 'fresh@dealer.com', feed_protocol: 'sftp_incoming', feed_sftp_provisioned_at: new Date(now - 200 * HOUR).toISOString(), feed_sftp_last_received_at: new Date(now - 1 * HOUR).toISOString(), feed_last_success_at: null },
      { id: 'd2', name: 'Stale Motors', email: 'stale@dealer.com', feed_protocol: 'sftp_incoming', feed_sftp_provisioned_at: new Date(now - 200 * HOUR).toISOString(), feed_sftp_last_received_at: new Date(now - 100 * HOUR).toISOString(), feed_last_success_at: null },
      { id: 'd3', name: 'Stale Pull Motors', email: 'stalepull@dealer.com', feed_protocol: 'https', feed_sftp_provisioned_at: null, feed_sftp_last_received_at: null, feed_last_success_at: new Date(now - 100 * HOUR).toISOString() },
    ]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.checkedCount).toBe(3);
    expect(res._data.staleCount).toBe(2);
    const [, body] = mockNotifyAdmin.mock.calls[0];
    expect(body).toContain('Stale Motors');
    expect(body).toContain('Stale Pull Motors');
    expect(body).not.toContain('Fresh Motors');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('does not fail the whole run if one dealer alert email fails to send', async () => {
    mockSend.mockRejectedValueOnce(new Error('send failed'));
    makeDealersMock([{
      id: 'd1', name: 'Stale Motors', email: 'stale@dealer.com', feed_protocol: 'sftp_incoming',
      feed_sftp_provisioned_at: new Date(now - 200 * HOUR).toISOString(),
      feed_sftp_last_received_at: new Date(now - 50 * HOUR).toISOString(),
      feed_last_success_at: null,
    }]);
    const res: any = await GET(makeRequest('Bearer cron-secret'));
    expect(res._data.staleCount).toBe(1);
    expect(mockLoggerError).toHaveBeenCalledWith('Failed to send feed-staleness alert to dealer', expect.objectContaining({ dealerId: 'd1' }));
  });
});
