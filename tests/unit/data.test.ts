import { describe, it, expect } from 'vitest';
import { formatPrice, formatMileage, formatPhone, toSegment, searchCars } from '@/lib/data';

describe('formatPrice', () => {
  it('formats whole dollar amounts with no decimals', () => {
    expect(formatPrice(89500)).toBe('$89,500');
  });

  it('formats zero as $0', () => {
    expect(formatPrice(0)).toBe('$0');
  });

  it('formats large prices with commas', () => {
    expect(formatPrice(185000)).toBe('$185,000');
  });

  it('formats prices under $1000', () => {
    expect(formatPrice(500)).toBe('$500');
  });
});

describe('formatMileage', () => {
  it('formats mileage with commas and mi suffix', () => {
    expect(formatMileage(42100)).toBe('42,100 mi');
  });

  it('returns N/A for null', () => {
    expect(formatMileage(null)).toBe('N/A');
  });

  it('formats zero mileage', () => {
    expect(formatMileage(0)).toBe('0 mi');
  });
});

describe('formatPhone', () => {
  it('formats a 10-digit string', () => {
    expect(formatPhone('6155550142')).toBe('(615) 555-0142');
  });

  it('strips non-digit characters before formatting', () => {
    expect(formatPhone('(615) 555-0142')).toBe('(615) 555-0142');
  });

  it('handles a 6-digit partial', () => {
    expect(formatPhone('615555')).toBe('(615) 555');
  });

  it('handles a very short string', () => {
    expect(formatPhone('6')).toBe('6');
  });
});

describe('toSegment', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(toSegment('Ford Mustang')).toBe('ford-mustang');
  });

  it('collapses multiple spaces into one hyphen', () => {
    expect(toSegment('Dodge  Charger')).toBe('dodge-charger');
  });

  it('trims leading and trailing hyphens', () => {
    expect(toSegment(' Chevrolet ')).toBe('chevrolet');
  });

  it('removes special characters', () => {
    expect(toSegment('GTO R/T')).toBe('gto-r-t');
  });

  it('leaves already-slugged strings unchanged', () => {
    expect(toSegment('ford-mustang')).toBe('ford-mustang');
  });
});

describe('searchCars', () => {
  it('returns results when no filters applied', () => {
    expect(searchCars({}).length).toBeGreaterThan(0);
  });

  it('filters by make', () => {
    const results = searchCars({ make: 'Chevrolet' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(c => c.make === 'Chevrolet')).toBe(true);
  });

  it('returns empty array for unknown make', () => {
    expect(searchCars({ make: 'Lamborghini' })).toHaveLength(0);
  });

  it('does not filter when make is All Makes', () => {
    const all = searchCars({});
    expect(searchCars({ make: 'All Makes' }).length).toBe(all.length);
  });

  it('filters by year range', () => {
    const results = searchCars({ yearMin: 1965, yearMax: 1970 });
    expect(results.every(c => c.year >= 1965 && c.year <= 1970)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('filters by price range', () => {
    const results = searchCars({ priceMin: 50000, priceMax: 100000 });
    expect(results.every(c => c.price >= 50000 && c.price <= 100000)).toBe(true);
  });

  it('filters by condition', () => {
    const results = searchCars({ condition: 'Excellent' });
    expect(results.every(c => c.condition === 'Excellent')).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('does not filter when condition is All', () => {
    const all = searchCars({});
    expect(searchCars({ condition: 'All' }).length).toBe(all.length);
  });

  it('filters by transmission', () => {
    const manual = searchCars({ transmission: 'Manual' });
    const auto = searchCars({ transmission: 'Automatic' });
    expect(manual.every(c => c.transmission === 'Manual')).toBe(true);
    expect(auto.every(c => c.transmission === 'Automatic')).toBe(true);
    expect(manual.length + auto.length).toBe(searchCars({}).length);
  });

  it('filters by state', () => {
    const results = searchCars({ state: 'TN' });
    expect(results.every(c => c.state === 'TN')).toBe(true);
  });

  it('filters by query matching title (case-insensitive)', () => {
    const results = searchCars({ query: 'camaro' });
    expect(results.some(c => c.title.toLowerCase().includes('camaro'))).toBe(true);
  });

  it('filters by query matching description', () => {
    const results = searchCars({ query: 'numbers-matching' });
    expect(results.length).toBeGreaterThan(0);
  });

  it('returns only featured listings when featured is true', () => {
    const results = searchCars({ featured: true });
    expect(results.every(c => c.featured)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('combines make + condition + transmission filters', () => {
    const results = searchCars({ make: 'Chevrolet', condition: 'Excellent', transmission: 'Manual' });
    expect(results.every(c =>
      c.make === 'Chevrolet' && c.condition === 'Excellent' && c.transmission === 'Manual'
    )).toBe(true);
  });
});
