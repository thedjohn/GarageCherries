import { describe, it, expect } from 'vitest';

// Replicate the listing limit logic from api/listings/submit/route.ts
// so it can be tested without Next.js/Supabase context
function isAtLimit(activeCount: number, isDealer: boolean, betaMode: boolean): boolean {
  if (isDealer) return false;
  if (betaMode) return false;
  return activeCount >= 10;
}

describe('listing limit logic', () => {
  it('blocks private seller at 10 active listings', () => {
    expect(isAtLimit(10, false, false)).toBe(true);
  });

  it('blocks private seller above 10', () => {
    expect(isAtLimit(15, false, false)).toBe(true);
  });

  it('allows private seller below limit', () => {
    expect(isAtLimit(9, false, false)).toBe(false);
  });

  it('allows private seller at exactly 0 listings', () => {
    expect(isAtLimit(0, false, false)).toBe(false);
  });

  it('never blocks a dealer regardless of count', () => {
    expect(isAtLimit(100, true, false)).toBe(false);
  });

  it('never blocks when BETA_MODE is true', () => {
    expect(isAtLimit(50, false, true)).toBe(false);
  });

  it('dealer + BETA_MODE both set — still not blocked', () => {
    expect(isAtLimit(100, true, true)).toBe(false);
  });
});
