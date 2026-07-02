import { describe, it, expect } from 'vitest';

// ─── Price drop notification ───────────────────────────────────────────────
describe('price drop email trigger', () => {
  function shouldSendPriceDrop(oldPrice: number, newPrice: number): boolean {
    return newPrice > 0 && newPrice < oldPrice;
  }

  it('sends when price drops', () => {
    expect(shouldSendPriceDrop(50000, 45000)).toBe(true);
  });

  it('does not send when price increases', () => {
    expect(shouldSendPriceDrop(45000, 50000)).toBe(false);
  });

  it('does not send when price is unchanged', () => {
    expect(shouldSendPriceDrop(45000, 45000)).toBe(false);
  });

  it('does not send when new price is zero or negative', () => {
    expect(shouldSendPriceDrop(45000, 0)).toBe(false);
    expect(shouldSendPriceDrop(45000, -1)).toBe(false);
  });
});

// ─── Sold notification ─────────────────────────────────────────────────────
describe('car sold email', () => {
  function buildSoldSubject(title: string): string {
    return `${title} has sold`;
  }

  function filterEmailRecipients(
    users: { id: string; email: string | null }[],
    watcherIds: string[],
  ): string[] {
    return users
      .filter(u => watcherIds.includes(u.id) && u.email)
      .map(u => u.email!);
  }

  it('generates correct subject', () => {
    expect(buildSoldSubject('1969 Chevrolet Camaro SS')).toBe('1969 Chevrolet Camaro SS has sold');
  });

  it('only emails watchers with valid email addresses', () => {
    const users = [
      { id: 'a', email: 'buyer@test.com' },
      { id: 'b', email: null },
      { id: 'c', email: 'other@test.com' },
    ];
    expect(filterEmailRecipients(users, ['a', 'b'])).toEqual(['buyer@test.com']);
  });

  it('returns empty list when no watchers have emails', () => {
    const users = [{ id: 'a', email: null }];
    expect(filterEmailRecipients(users, ['a'])).toHaveLength(0);
  });

  it('returns empty list when watcher list is empty', () => {
    const users = [{ id: 'a', email: 'x@x.com' }];
    expect(filterEmailRecipients(users, [])).toHaveLength(0);
  });
});

// ─── Dealer approval email ─────────────────────────────────────────────────
describe('dealer approval email', () => {
  function buildApprovalSubject(dealerName: string): string {
    return `Your GarageCherries dealer account is ready — ${dealerName}`;
  }

  it('generates correct approval subject', () => {
    expect(buildApprovalSubject('Classic Cars LLC')).toContain('Classic Cars LLC');
    expect(buildApprovalSubject('Classic Cars LLC')).toContain('dealer account');
  });
});

// ─── Listing approval email ────────────────────────────────────────────────
describe('listing status email triggers', () => {
  function requiresApprovalEmail(status: string): boolean {
    return status === 'approved';
  }

  function requiresRejectionEmail(status: string): boolean {
    return status === 'rejected';
  }

  it('sends approval email only for approved status', () => {
    expect(requiresApprovalEmail('approved')).toBe(true);
    expect(requiresApprovalEmail('pending')).toBe(false);
    expect(requiresApprovalEmail('rejected')).toBe(false);
  });

  it('sends rejection email only for rejected status', () => {
    expect(requiresRejectionEmail('rejected')).toBe(true);
    expect(requiresRejectionEmail('approved')).toBe(false);
    expect(requiresRejectionEmail('pending')).toBe(false);
  });
});

// ─── Admin notification triggers ──────────────────────────────────────────
describe('admin notification triggers', () => {
  function shouldNotifyOnRateLimit(isFirstBlock: boolean): boolean {
    return isFirstBlock;
  }

  it('only sends admin alert on first rate limit block, not subsequent', () => {
    expect(shouldNotifyOnRateLimit(true)).toBe(true);
    expect(shouldNotifyOnRateLimit(false)).toBe(false);
  });
});

// ─── Weekly digest ─────────────────────────────────────────────────────────
describe('weekly digest opt-out', () => {
  function isOptedOut(userMetadata: Record<string, unknown> | null): boolean {
    return userMetadata?.digest_opt_out === true;
  }

  it('respects opt-out flag', () => {
    expect(isOptedOut({ digest_opt_out: true })).toBe(true);
  });

  it('includes user without opt-out flag', () => {
    expect(isOptedOut({})).toBe(false);
    expect(isOptedOut(null)).toBe(false);
  });

  it('explicit false is not opted out', () => {
    expect(isOptedOut({ digest_opt_out: false })).toBe(false);
  });
});
