import { describe, it, expect } from 'vitest';
import type { Car } from '@/lib/types';
import { scoreMatch } from '@/lib/matchAlerts';

const baseCar: Car = {
  id: 'c1', slug: '1969-dodge-charger-rt', title: '1969 Dodge Charger R/T',
  year: 1969, make: 'Dodge', model: 'Charger',
  price: 112000, mileage: 31450,
  location: 'Charlotte', state: 'NC',
  condition: 'Excellent', bodyStyle: 'Hardtop',
  transmission: 'Automatic', engine: '440 Magnum V8',
  color: 'Plum Crazy Purple', images: [],
  description: 'Broadcast sheet documented 1969 Charger R/T.',
  sellerId: 'u3', sellerName: "Mopar Mike's", sellerPhone: '(704) 555-0211',
  featured: true, listedAt: '2025-05-08',
};

describe('scoreMatch — hard criteria (make / model)', () => {
  it('returns 0 when make does not match', () => {
    expect(scoreMatch(baseCar, { make: 'Chevrolet' })).toBe(0);
  });

  it('returns 0 when model does not match', () => {
    expect(scoreMatch(baseCar, { make: 'Dodge', model: 'Challenger' })).toBe(0);
  });

  it('is case-insensitive on make', () => {
    expect(scoreMatch(baseCar, { make: 'dodge' })).toBe(1);
  });

  it('does partial model matching', () => {
    expect(scoreMatch(baseCar, { model: 'Char' })).toBe(1);
  });

  it('returns 1 when only hard criteria set and they match', () => {
    expect(scoreMatch(baseCar, { make: 'Dodge', model: 'Charger' })).toBe(1);
  });
});

describe('scoreMatch — soft criteria scoring', () => {
  it('returns 1.0 when all criteria match', () => {
    const score = scoreMatch(baseCar, {
      make: 'Dodge',
      year_min: 1965, year_max: 1972,
      price_max: 120000,
      mileage_max: 50000,
      condition: ['Excellent'],
      body_style: 'Hardtop',
      transmission: 'Automatic',
      state: 'NC',
    });
    expect(score).toBe(1);
  });

  it('returns 0 when make hard-fails despite matching soft criteria', () => {
    const score = scoreMatch(baseCar, {
      make: 'Ford',
      price_max: 200000,
    });
    expect(score).toBe(0);
  });

  it('scores partial match correctly', () => {
    // year(2) + price(2) = 4 possible; only year matches = 2/4 = 0.5
    const score = scoreMatch(baseCar, {
      year_min: 1960, year_max: 1975,   // matches — +2
      price_max: 100000,                  // does NOT match (112k > 100k) — +0
    });
    expect(score).toBe(0.5);
  });

  it('returns 1 when no soft criteria set (only hard make/model)', () => {
    expect(scoreMatch(baseCar, { make: 'Dodge' })).toBe(1);
  });

  it('excludes car when price_max exceeded', () => {
    const score = scoreMatch(baseCar, { price_max: 50000 });
    // 0 out of 2 possible price points
    expect(score).toBe(0);
  });

  it('excludes car when mileage_max exceeded', () => {
    const score = scoreMatch(baseCar, { mileage_max: 10000 });
    expect(score).toBe(0);
  });

  it('matches condition from array', () => {
    const score = scoreMatch(baseCar, { condition: ['Excellent', 'Good'] });
    expect(score).toBe(1);
  });

  it('misses condition not in array', () => {
    const score = scoreMatch(baseCar, { condition: ['Fair'] });
    expect(score).toBe(0);
  });

  it('matches state', () => {
    expect(scoreMatch(baseCar, { state: 'NC' })).toBe(1);
  });

  it('misses wrong state', () => {
    expect(scoreMatch(baseCar, { state: 'CA' })).toBe(0);
  });

  it('alert threshold: 70% required — score of 0.5 would not qualify', () => {
    const score = scoreMatch(baseCar, {
      year_min: 1960, year_max: 1975,
      price_max: 100000,
    });
    expect(score).toBeLessThan(0.7);
  });

  it('alert threshold: score of 1.0 qualifies', () => {
    const score = scoreMatch(baseCar, {
      make: 'Dodge',
      price_max: 120000,
    });
    expect(score).toBeGreaterThanOrEqual(0.7);
  });
});

describe('scoreMatch — null mileage handling', () => {
  it('does not match mileage_max when car mileage is null', () => {
    const carNoMileage = { ...baseCar, mileage: undefined as any };
    const score = scoreMatch(carNoMileage, { mileage_max: 50000 });
    // 1 possible point, 0 matched = 0
    expect(score).toBe(0);
  });
});
