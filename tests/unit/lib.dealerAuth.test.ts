import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { resolveDealerId, isAuthorizedForSeller } from '@/lib/dealerAuth';

function mockTables(opts: { dealerRow?: { id: string } | null; membershipRow?: { dealer_id?: string; id?: string } | null }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'dealers') {
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.dealerRow ?? null }) }) }) };
    }
    if (table === 'dealer_members') {
      return { select: () => ({ eq: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: opts.membershipRow ?? null }) }),
        maybeSingle: () => Promise.resolve({ data: opts.membershipRow ?? null }),
      }) }) };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveDealerId', () => {
  it("returns the dealer's own id when the user is the dealer itself (parent, unchanged today's behavior)", async () => {
    mockTables({ dealerRow: { id: 'dealer-1' } });
    const result = await resolveDealerId('dealer-1');
    expect(result).toBe('dealer-1');
  });

  it('falls back to the linked dealer id when the user is a team member, not the dealer itself', async () => {
    mockTables({ dealerRow: null, membershipRow: { dealer_id: 'dealer-1' } });
    const result = await resolveDealerId('member-user-1');
    expect(result).toBe('dealer-1');
  });

  it('returns null when the user is neither a dealer nor a team member', async () => {
    mockTables({ dealerRow: null, membershipRow: null });
    const result = await resolveDealerId('random-user');
    expect(result).toBeNull();
  });
});

describe('isAuthorizedForSeller', () => {
  it('returns true immediately on a direct id match, without querying dealer_members', async () => {
    mockFrom.mockImplementation(() => { throw new Error('should not be called'); });
    const result = await isAuthorizedForSeller('user-1', 'user-1');
    expect(result).toBe(true);
  });

  it('returns true when the user is a team member of the given seller/dealer', async () => {
    mockTables({ membershipRow: { id: 'membership-1' } });
    const result = await isAuthorizedForSeller('member-user-1', 'dealer-1');
    expect(result).toBe(true);
  });

  it('returns false when the user is neither the seller nor a team member of it', async () => {
    mockTables({ membershipRow: null });
    const result = await isAuthorizedForSeller('random-user', 'dealer-1');
    expect(result).toBe(false);
  });

  it('returns false without querying anything when sellerId is null/undefined (e.g. listing not found)', async () => {
    mockFrom.mockImplementation(() => { throw new Error('should not be called'); });
    expect(await isAuthorizedForSeller('user-1', null)).toBe(false);
    expect(await isAuthorizedForSeller('user-1', undefined)).toBe(false);
  });
});
