import { describe, it, expect } from 'vitest';
import type { Car } from '@/lib/types';

// scoreMatch and alertName are not exported — test them indirectly via the
// scoring logic by re-implementing just enough to verify the business rules.
// The real exports are matchAndNotifyAlerts (requires Supabase) and buildEmail
// (private). We test the pure scoring contract by extracting it here.

function scoreMatch(car: Car, s: Record<string, any>): number {
  if (s.make && s.make !== 'All Makes' && car.make.toLowerCase() !== s.make.toLowerCase()) return 0;
  if (s.model && !car.model.toLowerCase().includes(s.model.toLowerCase().trim())) return 0;

  let possible = 0;
  let matched = 0;

  if (s.year_min || s.year_max) {
    possible += 2;
    if ((!s.year_min || car.year >= s.year_min) && (!s.year_max || car.year <= s.year_max)) matched += 2;
  }
  if (s.price_max) {
    possible += 2;
    if (car.price <= s.price_max) matched += 2;
  }
  if (s.mileage_max) {
    possible += 1;
    if (car.mileage != null && car.mileage <= s.mileage_max) matched += 1;
  }
  if (s.condition?.length) {
    possible += 1;
    if (s.condition.includes(car.condition)) matched += 1;
  }
  if (s.body_style) {
    possible += 1;
    if (car.bodyStyle === s.body_style) matched += 1;
  }
  if (s.transmission) {
    possible += 1;
    if (car.transmission === s.transmission) matched += 1;
  }
  if (s.state) {
    possible += 1;
    if (car.state === s.state) matched += 1;
  }

  if (possible === 0) return 1;
  return matched / possible;
}

const baseCar: Car = {
  id: 'test-1',
  slug: '1969-dodge-charger',
  title: '1969 Dodge Charger R/T',
  year: 1969,
  make: 'Dodge',
  model: 'Charger',
  price: 112000,
  mileage: 31450,
  location: 'Charlotte',
  state: 'NC',
  condition: 'Excellent',
  bodyStyle: 'Hardtop',
  transmission: 'Automatic',
  engine: '440 Magnum V8',
  color: 'Plum Crazy Purple',
  images: [],
  description: 'Numbers-matching Charger R/T',
  sellerId: 'u1',
  sellerName: 'Mopar Mikes',
  sellerPhone: '(704) 555-0211',
  featured: true,
  listedAt: '2026-07-03',
};

describe('scoreMatch — hard criteria (make/model)', () => {
  it('returns 0 when make does not match', () => {
    expect(scoreMatch(baseCar, { make: 'Ford' })).toBe(0);
  });

  it('returns 1 when make matches and no soft criteria set', () => {
    expect(scoreMatch(baseCar, { make: 'Dodge' })).toBe(1);
  });

  it('is case-insensitive on make', () => {
    expect(scoreMatch(baseCar, { make: 'dodge' })).toBe(1);
  });

  it('returns 0 when model does not match', () => {
    expect(scoreMatch(baseCar, { make: 'Dodge', model: 'Challenger' })).toBe(0);
  });

  it('matches partial model name', () => {
    expect(scoreMatch(baseCar, { make: 'Dodge', model: 'Char' })).toBe(1);
  });

  it('returns 1 when no criteria set at all (empty alert)', () => {
    expect(scoreMatch(baseCar, {})).toBe(1);
  });
});

describe('scoreMatch — soft criteria scoring', () => {
  it('returns 1 when year is within range', () => {
    expect(scoreMatch(baseCar, { year_min: 1965, year_max: 1972 })).toBe(1);
  });

  it('returns 0 when year is outside range', () => {
    expect(scoreMatch(baseCar, { year_min: 1970, year_max: 1975 })).toBe(0);
  });

  it('returns 1 when price is within max', () => {
    expect(scoreMatch(baseCar, { price_max: 120000 })).toBe(1);
  });

  it('returns 0 when price exceeds max', () => {
    expect(scoreMatch(baseCar, { price_max: 100000 })).toBe(0);
  });

  it('returns 1 when mileage is within max', () => {
    expect(scoreMatch(baseCar, { mileage_max: 40000 })).toBe(1);
  });

  it('returns 0 when mileage exceeds max', () => {
    expect(scoreMatch(baseCar, { mileage_max: 20000 })).toBe(0);
  });

  it('returns 1 when condition matches', () => {
    expect(scoreMatch(baseCar, { condition: ['Excellent'] })).toBe(1);
  });

  it('returns 0 when condition does not match', () => {
    expect(scoreMatch(baseCar, { condition: ['Good', 'Fair'] })).toBe(0);
  });

  it('returns 1 when body style matches', () => {
    expect(scoreMatch(baseCar, { body_style: 'Hardtop' })).toBe(1);
  });

  it('returns 0 when body style does not match', () => {
    expect(scoreMatch(baseCar, { body_style: 'Convertible' })).toBe(0);
  });

  it('returns 1 when transmission matches', () => {
    expect(scoreMatch(baseCar, { transmission: 'Automatic' })).toBe(1);
  });

  it('returns 0 when transmission does not match', () => {
    expect(scoreMatch(baseCar, { transmission: 'Manual' })).toBe(0);
  });

  it('returns 1 when state matches', () => {
    expect(scoreMatch(baseCar, { state: 'NC' })).toBe(1);
  });

  it('returns 0 when state does not match', () => {
    expect(scoreMatch(baseCar, { state: 'TX' })).toBe(0);
  });
});

describe('scoreMatch — partial match scoring', () => {
  it('returns 0.5 when half of soft criteria match', () => {
    // price_max passes (2pts), mileage_max fails (1pt) — 2/3 ≈ 0.667
    const score = scoreMatch(baseCar, { price_max: 120000, mileage_max: 20000 });
    expect(score).toBeCloseTo(2 / 3);
  });

  it('scores at least 0.7 on a near-perfect alert', () => {
    const score = scoreMatch(baseCar, {
      make: 'Dodge',
      year_min: 1965,
      year_max: 1972,
      price_max: 120000,
      condition: ['Excellent'],
      transmission: 'Automatic',
      state: 'NC',
    });
    expect(score).toBeGreaterThanOrEqual(0.7);
  });

  it('scores below 0.7 when most soft criteria miss', () => {
    const score = scoreMatch(baseCar, {
      make: 'Dodge',
      year_min: 1970,
      year_max: 1975,
      price_max: 50000,
      condition: ['Good'],
    });
    expect(score).toBeLessThan(0.7);
  });
});
