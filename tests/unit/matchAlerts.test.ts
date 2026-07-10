import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Car } from '@/lib/types';

const { mockFrom, mockGetUserById, mockSend } = vi.hoisted(() => ({
  mockFrom:        vi.fn(),
  mockGetUserById: vi.fn(),
  mockSend:        vi.fn().mockResolvedValue({ id: 'email-1' }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, auth: { admin: { getUserById: mockGetUserById } } })),
}));
vi.mock('resend', () => ({ Resend: vi.fn(function (this: any) { return { emails: { send: mockSend } }; }) }));

// scoreMatch itself is thoroughly covered in tests/unit/scoreMatch.test.ts —
// this file covers alertName, matchBadges, and the matchAndNotifyAlerts
// orchestrator (DB lookups, cooldown, dedup, opt-out, and email send).
import { matchAndNotifyAlerts, alertName, matchBadges } from '@/lib/matchAlerts';

const car: Car = {
  id: 'c1', slug: '1969-dodge-charger-rt', title: '1969 Dodge Charger R/T',
  year: 1969, make: 'Dodge', model: 'Charger',
  price: 112000, mileage: 31450,
  location: 'Charlotte', state: 'NC',
  condition: 'Excellent', bodyStyle: 'Hardtop',
  transmission: 'Automatic', engine: '440 Magnum V8',
  color: 'Plum Crazy Purple', images: ['https://x.com/a.jpg'],
  description: 'Broadcast sheet documented 1969 Charger R/T.',
  sellerId: 'u3', sellerName: "Mopar Mike's", sellerPhone: '(704) 555-0211',
  featured: true, listedAt: '2025-05-08',
};

function matchingSearch(overrides: Record<string, unknown> = {}) {
  return { id: 's1', user_id: 'buyer-1', active: true, paused: false, make: 'Dodge', ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUserById.mockResolvedValue({ data: { user: { email: 'buyer@x.com', user_metadata: {} } } });
});

describe('alertName', () => {
  it('uses the custom name when set', () => {
    expect(alertName({ name: 'My Dream Car' })).toBe('My Dream Car');
  });

  it('builds a name from make + model when no custom name is set', () => {
    expect(alertName({ make: 'Dodge', model: 'Charger' })).toBe('Dodge Charger Alert');
  });

  it('falls back to a generic name with no make/model/name', () => {
    expect(alertName({})).toBe('Car Alert');
  });
});

describe('matchBadges', () => {
  it('includes only the criteria that were actually set and matched', () => {
    const badges = matchBadges(car, { make: 'Dodge', price_max: 120000, mileage_max: 10000 });
    expect(badges).toContain('Make: Dodge');
    expect(badges).toContain('Price:');
    expect(badges).not.toContain('Mileage:'); // 31450 > 10000, so not matched
  });

  it('returns an empty string when no criteria are set', () => {
    expect(matchBadges(car, {})).toBe('');
  });
});

describe('matchAndNotifyAlerts', () => {
  it('does nothing when there are no active/unpaused saved searches', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [] }) }) }) });
    await matchAndNotifyAlerts(car);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips a search that scores below the 0.7 threshold', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch({ make: 'Ford' })] }) }) }) });
    await matchAndNotifyAlerts(car);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips a search still within its 24h email cooldown', async () => {
    mockFrom.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch({ last_emailed_at: new Date().toISOString() })] }) }) }) });
    await matchAndNotifyAlerts(car);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('sends when the cooldown has expired', async () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 3600_000).toISOString();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'saved_searches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch({ last_emailed_at: twoDaysAgo })] }) }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) };
      if (table === 'alert_matches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }), insert: vi.fn().mockResolvedValue({}) };
      return {};
    });
    await matchAndNotifyAlerts(car);
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('skips a search that already has a match recorded for this car', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'saved_searches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch()] }) }) }) };
      if (table === 'alert_matches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'existing-match' } }) }) }) }) };
      return {};
    });
    await matchAndNotifyAlerts(car);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips when the user has no resolvable email', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'saved_searches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch()] }) }) }) };
      if (table === 'alert_matches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }) };
      return {};
    });
    mockGetUserById.mockResolvedValue({ data: { user: null } });
    await matchAndNotifyAlerts(car);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips a user who opted out of alert emails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'saved_searches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch()] }) }) }) };
      if (table === 'alert_matches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }) };
      return {};
    });
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'buyer@x.com', user_metadata: { alerts_opt_out: true } } } });
    await matchAndNotifyAlerts(car);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('records the match, updates the search cooldown, and emails on a fresh qualifying match', async () => {
    const insert = vi.fn().mockResolvedValue({});
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'saved_searches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch()] }) }) }), update };
      if (table === 'alert_matches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }), insert };
      return {};
    });
    await matchAndNotifyAlerts(car);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ saved_search_id: 's1', car_id: 'c1' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ last_emailed_at: expect.any(String) }));
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].to).toBe('buyer@x.com');
  });

  it('continues past a per-search failure without throwing', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'saved_searches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch(), matchingSearch({ id: 's2' })] }) }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) };
      if (table === 'alert_matches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }), insert: vi.fn().mockResolvedValue({}) };
      return {};
    });
    mockGetUserById.mockRejectedValueOnce(new Error('lookup failed')).mockResolvedValue({ data: { user: { email: 'buyer@x.com', user_metadata: {} } } });
    await expect(matchAndNotifyAlerts(car)).resolves.not.toThrow();
    expect(mockSend).toHaveBeenCalledOnce();
  });

  it('handles a car with no images (buildEmail image branch)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'saved_searches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [matchingSearch()] }) }) }), update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) }) };
      if (table === 'alert_matches') return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }), insert: vi.fn().mockResolvedValue({}) };
      return {};
    });
    await matchAndNotifyAlerts({ ...car, images: [] });
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend.mock.calls[0][0].html).not.toContain('<img src="" ');
  });
});
