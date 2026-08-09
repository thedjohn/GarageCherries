import { describe, it, expect } from 'vitest';
import { STATE_NAMES, stateSlug, stateCodeFromSlug } from '@/lib/usStates';

describe('usStates', () => {
  it('maps every 2-letter code to a real full state name', () => {
    expect(STATE_NAMES.OH).toBe('Ohio');
    expect(STATE_NAMES.CA).toBe('California');
    expect(Object.keys(STATE_NAMES)).toHaveLength(50);
  });

  it('slugifies a state code to a URL-safe lowercase name', () => {
    expect(stateSlug('OH')).toBe('ohio');
    expect(stateSlug('NC')).toBe('north-carolina');
  });

  it('falls back to slugifying the raw code if it is not a known state', () => {
    expect(stateSlug('ZZ')).toBe('zz');
  });

  it('resolves a state slug back to its 2-letter code', () => {
    expect(stateCodeFromSlug('ohio')).toBe('OH');
    expect(stateCodeFromSlug('north-carolina')).toBe('NC');
  });

  it('returns null for a slug that does not match any known state', () => {
    expect(stateCodeFromSlug('not-a-real-state')).toBeNull();
  });
});
