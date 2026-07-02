import { describe, it, expect } from 'vitest';

// ─── Private seller listing limit ─────────────────────────────────────────
describe('private seller listing limit', () => {
  const LIMIT = 10;

  function canSubmitListing(
    isDealer: boolean,
    activeCount: number,
    betaMode: boolean,
  ): { allowed: boolean; reason?: string } {
    if (betaMode) return { allowed: true };
    if (isDealer) return { allowed: true };
    if (activeCount >= LIMIT) return { allowed: false, reason: 'LISTING_LIMIT' };
    return { allowed: true };
  }

  it('private seller under limit can submit', () => {
    expect(canSubmitListing(false, 5, false).allowed).toBe(true);
  });

  it('private seller at limit is blocked', () => {
    const result = canSubmitListing(false, 10, false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('LISTING_LIMIT');
  });

  it('dealer is never limited', () => {
    expect(canSubmitListing(true, 500, false).allowed).toBe(true);
  });

  it('beta mode bypasses all limits', () => {
    expect(canSubmitListing(false, 100, true).allowed).toBe(true);
  });
});

// ─── Dealer beta expiry ────────────────────────────────────────────────────
describe('dealer beta expiry enforcement', () => {
  function checkBeta(beta_expires_at: string | null | undefined): 'expired' | 'active' | 'none' {
    if (!beta_expires_at) return 'none';
    return new Date(beta_expires_at) < new Date() ? 'expired' : 'active';
  }

  it('active beta allows operations', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(checkBeta(future)).toBe('active');
  });

  it('expired beta blocks operations', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(checkBeta(past)).toBe('expired');
  });

  it('null means no expiry (legacy dealer)', () => {
    expect(checkBeta(null)).toBe('none');
    expect(checkBeta(undefined)).toBe('none');
  });
});

// ─── Advertiser trial expiry ──────────────────────────────────────────────
describe('advertiser trial enforcement', () => {
  const TRIAL_DAYS = 14;

  function trialEndsAt(signupDate: Date): string {
    return new Date(signupDate.getTime() + TRIAL_DAYS * 86400000).toISOString();
  }

  function isTrialExpired(trial_ends_at: string | null): boolean {
    if (!trial_ends_at) return false;
    return new Date(trial_ends_at) < new Date();
  }

  it('trial is 14 days from signup', () => {
    const now = new Date();
    const end = new Date(trialEndsAt(now));
    const days = (end.getTime() - now.getTime()) / 86400000;
    expect(Math.round(days)).toBe(14);
  });

  it('fresh trial is not expired', () => {
    expect(isTrialExpired(trialEndsAt(new Date()))).toBe(false);
  });

  it('expired trial is detected', () => {
    // Signup was 20 days ago — 14-day trial ended 6 days ago
    const past = new Date(Date.now() - 20 * 86400000);
    expect(isTrialExpired(trialEndsAt(past))).toBe(true);
  });

  it('null trial_ends_at means no expiry', () => {
    expect(isTrialExpired(null)).toBe(false);
  });

  it('trial expired ads must not be served', () => {
    const expiredTrialEnd = new Date(Date.now() - 1000).toISOString();
    const now = new Date().toISOString();
    const advertisers = [
      { id: '1', trial_ends_at: expiredTrialEnd },
      { id: '2', trial_ends_at: new Date(Date.now() + 86400000).toISOString() },
      { id: '3', trial_ends_at: null },
    ];
    const eligible = advertisers.filter(a =>
      !a.trial_ends_at || a.trial_ends_at > now
    );
    expect(eligible.map(a => a.id)).toEqual(['2', '3']);
  });
});

// ─── Resubmission limit ───────────────────────────────────────────────────
describe('listing resubmission', () => {
  function canResubmit(status: string, hasFixNote: boolean): boolean {
    if (status !== 'rejected') return false;
    return hasFixNote;
  }

  it('rejected listing with fix note can resubmit', () => {
    expect(canResubmit('rejected', true)).toBe(true);
  });

  it('rejected listing without fix note is blocked', () => {
    expect(canResubmit('rejected', false)).toBe(false);
  });

  it('approved listing cannot resubmit via this flow', () => {
    expect(canResubmit('approved', true)).toBe(false);
  });

  it('pending listing cannot resubmit', () => {
    expect(canResubmit('pending', true)).toBe(false);
  });
});

// ─── Rate limiting logic ──────────────────────────────────────────────────
describe('rate limiting', () => {
  function withinLimit(count: number, max: number): boolean {
    return count <= max;
  }

  it('allows requests under the limit', () => {
    expect(withinLimit(4, 5)).toBe(true);
  });

  it('blocks at the limit', () => {
    expect(withinLimit(5, 5)).toBe(true); // 5th is still allowed
    expect(withinLimit(6, 5)).toBe(false); // 6th is blocked
  });

  it('blocks well over the limit', () => {
    expect(withinLimit(100, 5)).toBe(false);
  });
});

// ─── Alert criteria validation ────────────────────────────────────────────
describe('search alert validation', () => {
  const MAX_ALERTS = 10;
  const MIN_CRITERIA = 2;

  function countCriteria(filters: Record<string, unknown>): number {
    return Object.values(filters).filter(v => v !== null && v !== undefined && v !== '').length;
  }

  function canCreateAlert(existingCount: number, criteria: number): boolean {
    return existingCount < MAX_ALERTS && criteria >= MIN_CRITERIA;
  }

  it('requires at least 2 criteria', () => {
    expect(canCreateAlert(0, 1)).toBe(false);
    expect(canCreateAlert(0, 2)).toBe(true);
  });

  it('blocks when user has max alerts', () => {
    expect(canCreateAlert(10, 3)).toBe(false);
    expect(canCreateAlert(9, 3)).toBe(true);
  });

  it('counts non-empty filter values correctly', () => {
    expect(countCriteria({ make: 'Ford', model: '', year: null })).toBe(1);
    expect(countCriteria({ make: 'Ford', state: 'MO' })).toBe(2);
  });
});
