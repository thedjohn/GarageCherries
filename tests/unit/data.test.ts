import { describe, it, expect } from 'vitest';
import {
  formatPrice,
  formatMileage,
  formatPhone,
  toSegment,
  makeFromSegment,
  searchCars,
  getCar,
  getDealer,
} from '@/lib/data';

describe('formatPrice', () => {
  it('formats whole dollar amounts', () => {
    expect(formatPrice(89500)).toBe('$89,500');
    expect(formatPrice(0)).toBe('$0');
    expect(formatPrice(1000000)).toBe('$1,000,000');
  });

  it('rounds to whole dollars', () => {
    expect(formatPrice(89500.99)).toBe('$89,501');
  });
});

describe('formatMileage', () => {
  it('formats mileage with comma separator and mi suffix', () => {
    expect(formatMileage(42100)).toBe('42,100 mi');
    expect(formatMileage(1000)).toBe('1,000 mi');
  });

  it('returns N/A for null', () => {
    expect(formatMileage(null)).toBe('N/A');
  });

  it('handles zero mileage', () => {
    expect(formatMileage(0)).toBe('0 mi');
  });
});

describe('formatPhone', () => {
  it('formats a 10-digit number', () => {
    expect(formatPhone('6155550142')).toBe('(615) 555-0142');
  });

  it('strips non-digit characters before formatting', () => {
    expect(formatPhone('(615) 555-0142')).toBe('(615) 555-0142');
    expect(formatPhone('615.555.0142')).toBe('(615) 555-0142');
  });

  it('handles partial numbers gracefully', () => {
    expect(formatPhone('615')).toBe('615');   // < 4 digits — no formatting
    expect(formatPhone('61')).toBe('61');
  });

  it('truncates numbers longer than 10 digits', () => {
    expect(formatPhone('16155550142')).toBe('(161) 555-5014');
  });
});

describe('toSegment', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(toSegment('Dodge Charger')).toBe('dodge-charger');
  });

  it('converts apostrophes to hyphens (non-alphanumeric separator)', () => {
    // apostrophe becomes a hyphen separator: "Mike's" → "mike-s"
    expect(toSegment("Mopar Mike's")).toBe('mopar-mike-s');
  });

  it('collapses multiple spaces/special chars to single hyphen', () => {
    expect(toSegment('Ford  F-150')).toBe('ford-f-150');
  });

  it('trims leading and trailing hyphens', () => {
    expect(toSegment('-Test-')).toBe('test');
  });
});

describe('makeFromSegment', () => {
  it('returns the correctly-cased make for a valid segment', () => {
    expect(makeFromSegment('chevrolet')).toBe('Chevrolet');
    expect(makeFromSegment('ford')).toBe('Ford');
  });

  it('returns undefined for unknown segment', () => {
    expect(makeFromSegment('notamaker')).toBeUndefined();
  });
});

describe('searchCars', () => {
  it('returns all cars when no filters set', () => {
    const results = searchCars({});
    expect(results.length).toBeGreaterThan(0);
  });

  it('filters by make', () => {
    const results = searchCars({ make: 'Chevrolet' });
    expect(results.every(c => c.make === 'Chevrolet')).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns empty array for unknown make', () => {
    expect(searchCars({ make: 'Lamborghini' })).toHaveLength(0);
  });

  it('filters by year range', () => {
    const results = searchCars({ yearMin: 1965, yearMax: 1970 });
    expect(results.every(c => c.year >= 1965 && c.year <= 1970)).toBe(true);
  });

  it('filters by price range', () => {
    const results = searchCars({ priceMax: 60000 });
    expect(results.every(c => c.price <= 60000)).toBe(true);
  });

  it('filters by condition', () => {
    const results = searchCars({ condition: 'Excellent' });
    expect(results.every(c => c.condition === 'Excellent')).toBe(true);
  });

  it('filters by state', () => {
    const results = searchCars({ state: 'TN' });
    expect(results.every(c => c.state === 'TN')).toBe(true);
  });

  it('filters by transmission', () => {
    const manual = searchCars({ transmission: 'Manual' });
    expect(manual.every(c => c.transmission === 'Manual')).toBe(true);
  });

  it('filters featured cars', () => {
    const featured = searchCars({ featured: true });
    expect(featured.every(c => c.featured)).toBe(true);
  });

  it('filters by text query on title', () => {
    const results = searchCars({ query: 'Camaro' });
    expect(results.some(c => c.title.includes('Camaro'))).toBe(true);
  });

  it('skips All Makes sentinel', () => {
    const all = searchCars({});
    const filtered = searchCars({ make: 'All Makes' });
    expect(filtered.length).toBe(all.length);
  });
});

describe('getCar', () => {
  it('returns a car by slug', () => {
    const car = getCar('1967-chevrolet-camaro-ss');
    expect(car).toBeDefined();
    expect(car?.make).toBe('Chevrolet');
  });

  it('returns undefined for unknown slug', () => {
    expect(getCar('not-a-real-car')).toBeUndefined();
  });
});

describe('getDealer', () => {
  it('returns a dealer by slug', () => {
    const dealer = getDealer('classic-iron-nashville');
    expect(dealer).toBeDefined();
    expect(dealer?.state).toBe('TN');
  });

  it('returns undefined for unknown slug', () => {
    expect(getDealer('not-a-dealer')).toBeUndefined();
  });
});
