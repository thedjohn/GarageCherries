import { describe, it, expect } from 'vitest';
import { toSegment } from '@/lib/data';

// Replicate slug generation logic from api/listings/submit/route.ts
function generateSlug(year: number, make: string, model: string, ts: number): string {
  return `${year}-${make.toLowerCase().replace(/\s+/g, '-')}-${model.toLowerCase().replace(/\s+/g, '-')}-${ts}`;
}

describe('generateSlug', () => {
  it('produces expected format', () => {
    expect(generateSlug(1969, 'Dodge', 'Charger', 1234567890)).toBe('1969-dodge-charger-1234567890');
  });

  it('handles multi-word makes', () => {
    expect(generateSlug(1957, 'Aston Martin', 'DB5', 1000)).toBe('1957-aston-martin-db5-1000');
  });

  it('handles multi-word models', () => {
    expect(generateSlug(1967, 'Chevrolet', 'Camaro SS', 1000)).toBe('1967-chevrolet-camaro-ss-1000');
  });

  it('produces unique slugs for same car at different timestamps', () => {
    const s1 = generateSlug(1969, 'Dodge', 'Charger', 1000);
    const s2 = generateSlug(1969, 'Dodge', 'Charger', 2000);
    expect(s1).not.toBe(s2);
  });
});

describe('toSegment (URL path helper)', () => {
  it('converts dealer name to URL segment', () => {
    expect(toSegment('Classic Iron Nashville')).toBe('classic-iron-nashville');
  });

  it('converts apostrophes to hyphens (non-alphanumeric separator)', () => {
    expect(toSegment("Mopar Mike's")).toBe('mopar-mike-s');
  });

  it('handles R/T style model names', () => {
    expect(toSegment('Charger R/T')).toBe('charger-r-t');
  });

  it('handles numbers', () => {
    expect(toSegment('GT350')).toBe('gt350');
  });
});
