import { describe, it, expect } from 'vitest';
import {
  getEntry,
  getEntriesByMake,
  getMakeSlugs,
  getMakeLabel,
  ENCYCLOPEDIA,
} from '@/lib/encyclopedia';

describe('getEntry', () => {
  it('returns a known entry by make and model slug', () => {
    const entry = getEntry('chevrolet', 'camaro');
    expect(entry).not.toBeNull();
    expect(entry!.make).toBe('Chevrolet');
    expect(entry!.model).toBe('Camaro');
  });

  it('returns entry for Ford Mustang', () => {
    const entry = getEntry('ford', 'mustang');
    expect(entry).not.toBeNull();
    expect(entry!.make).toBe('Ford');
    expect(entry!.model).toBe('Mustang');
  });

  it('returns entry for Dodge Charger', () => {
    const entry = getEntry('dodge', 'charger');
    expect(entry).not.toBeNull();
    expect(entry!.make).toBe('Dodge');
  });

  it('returns null for unknown make', () => {
    expect(getEntry('ferrari', 'testarossa')).toBeNull();
  });

  it('returns null for known make but unknown model', () => {
    expect(getEntry('chevrolet', 'blazer')).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(getEntry('', '')).toBeNull();
  });

  it('returns entries with expected structure', () => {
    const entry = getEntry('chevrolet', 'corvette');
    expect(entry).not.toBeNull();
    expect(entry).toHaveProperty('make');
    expect(entry).toHaveProperty('model');
    expect(entry).toHaveProperty('years');
    expect(entry).toHaveProperty('tagline');
    expect(entry).toHaveProperty('overview');
    expect(Array.isArray(entry!.history)).toBe(true);
    expect(Array.isArray(entry!.specs)).toBe(true);
    expect(Array.isArray(entry!.notableVersions)).toBe(true);
    expect(Array.isArray(entry!.buyingTips)).toBe(true);
    expect(entry).toHaveProperty('priceRange');
  });

  it('slugifies multi-word models correctly', () => {
    const entry = getEntry('chevrolet', 'bel-air');
    expect(entry).not.toBeNull();
    expect(entry!.model).toBe('Bel Air');
  });

  it('slugifies multi-word makes correctly', () => {
    const entry = getEntry('oldsmobile', '4-4-2');
    expect(entry).not.toBeNull();
  });
});

describe('getEntriesByMake', () => {
  it('returns all Chevrolet entries', () => {
    const entries = getEntriesByMake('chevrolet');
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.make).toBe('Chevrolet');
    }
  });

  it('returns all Ford entries', () => {
    const entries = getEntriesByMake('ford');
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.make).toBe('Ford');
    }
  });

  it('returns empty array for unknown make', () => {
    expect(getEntriesByMake('lamborghini')).toHaveLength(0);
  });

  it('includes Camaro in Chevrolet entries', () => {
    const chevies = getEntriesByMake('chevrolet');
    const models = chevies.map(e => e.model);
    expect(models).toContain('Camaro');
    expect(models).toContain('Corvette');
  });
});

describe('getMakeSlugs', () => {
  it('returns an array of strings', () => {
    const slugs = getMakeSlugs();
    expect(Array.isArray(slugs)).toBe(true);
    expect(slugs.length).toBeGreaterThan(0);
    for (const s of slugs) {
      expect(typeof s).toBe('string');
    }
  });

  it('contains expected makes', () => {
    const slugs = getMakeSlugs();
    expect(slugs).toContain('chevrolet');
    expect(slugs).toContain('ford');
    expect(slugs).toContain('dodge');
    expect(slugs).toContain('pontiac');
  });

  it('returns unique values only', () => {
    const slugs = getMakeSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('returns lowercase hyphenated slugs', () => {
    const slugs = getMakeSlugs();
    for (const s of slugs) {
      expect(s).toBe(s.toLowerCase());
      expect(s).not.toMatch(/[^a-z0-9-]/);
    }
  });
});

describe('getMakeLabel', () => {
  it('returns the display label for a known make slug', () => {
    expect(getMakeLabel('chevrolet')).toBe('Chevrolet');
    expect(getMakeLabel('ford')).toBe('Ford');
    expect(getMakeLabel('dodge')).toBe('Dodge');
    expect(getMakeLabel('pontiac')).toBe('Pontiac');
  });

  it('returns null for unknown make', () => {
    expect(getMakeLabel('ferrari')).toBeNull();
    expect(getMakeLabel('')).toBeNull();
    expect(getMakeLabel('unknown-make')).toBeNull();
  });
});

describe('ENCYCLOPEDIA data integrity', () => {
  it('every entry has a non-empty tagline', () => {
    for (const entry of ENCYCLOPEDIA) {
      expect(entry.tagline.length).toBeGreaterThan(0);
    }
  });

  it('every entry has at least one buying tip', () => {
    for (const entry of ENCYCLOPEDIA) {
      expect(entry.buyingTips.length).toBeGreaterThan(0);
    }
  });

  it('every entry has at least one spec', () => {
    for (const entry of ENCYCLOPEDIA) {
      expect(entry.specs.length).toBeGreaterThan(0);
    }
  });

  it('priceRange has project, driver, and show keys', () => {
    for (const entry of ENCYCLOPEDIA) {
      expect(entry.priceRange).toHaveProperty('project');
      expect(entry.priceRange).toHaveProperty('driver');
      expect(entry.priceRange).toHaveProperty('show');
    }
  });
});
