import { describe, it, expect } from 'vitest';
import { inferBodyStyle } from '@/lib/inferBodyStyle';

describe('inferBodyStyle', () => {
  it.each([
    ['1963 Pontiac Bonneville Convertible', 'Convertible'],
    ['1983 Ferrari Mondial Cabriolet', 'Convertible'],
    ['1936 Ford 4 Door Convertible', 'Convertible'],
    ['1969 Porsche 911T Coupe', 'Coupe'],
    ['1962 Jaguar XKE Series I Roadster', 'Roadster'],
    ['1967 Ford Mustang Fastback', 'Fastback'],
    ['1970 Ford Mustang Mach 1 SportsRoof', 'Fastback'],
    ['1962 Ford Thunderbird Hardtop Coupe', 'Hardtop'],
    ['1961 Cadillac DeVille Sedan', 'Sedan'],
    ['1978 Lincoln Continental Town Car', 'Sedan'],
    ['1954 Chevrolet 210 Station Wagon', 'Station Wagon'],
    ['1950 Ford Woody Wagon', 'Station Wagon'],
    ['1941 Oldsmobile Series 60 Woodie', 'Station Wagon'],
    ['2005 Audi S4 Avant Quattro', 'Station Wagon'],
    ['1990 Ford Bronco Custom 4X4', 'SUV'],
    ['1995 Land Rover Defender 90', 'SUV'],
    ['1975 Toyota FJ40', 'SUV'],
    ['1985 Chevrolet Suburban', 'SUV'],
    ['1969 Chevrolet El Camino', 'Pickup Truck'],
    ['1955 Chevrolet 3100 327 V8 Restomod', 'Pickup Truck'],
    ['1972 GMC K2500', 'Pickup Truck'],
    ['1971 Chevrolet C15', 'Pickup Truck'],
    ['1952 Ford F1', 'Pickup Truck'],
    ['1956 Dodge C100', 'Pickup Truck'],
  ])('%s -> %s', (title, style) => {
    expect(inferBodyStyle(title)).toBe(style);
  });

  it('takes the first matching rule, so a Roadster Pickup is a truck', () => {
    expect(inferBodyStyle('1927 Ford Roadster Pickup')).toBe('Pickup Truck');
  });

  it('treats Power Wagon as a truck, not a station wagon', () => {
    expect(inferBodyStyle('1959 Dodge Power Wagon')).toBe('Pickup Truck');
  });

  it('leaves a sedan delivery blank (a panel wagon, not a sedan or station wagon)', () => {
    expect(inferBodyStyle('1958 Pontiac Pathfinder Sedan Delivery')).toBeNull();
    expect(inferBodyStyle('1952 Chevrolet Sedan Delivery Wagon')).toBeNull();
  });

  it('leaves a title with no body clue blank rather than guessing from the model', () => {
    expect(inferBodyStyle('1971 Datsun 240Z 4-Speed')).toBeNull();
    expect(inferBodyStyle('1969 Pontiac Trans Am')).toBeNull();
    expect(inferBodyStyle('1956 Bentley S1 Left-Hand-Drive')).toBeNull();
  });

  it('does not match on words that only contain a keyword', () => {
    expect(inferBodyStyle('1966 Ford Galaxie with wood dash and estate sale paperwork')).toBeNull();
    expect(inferBodyStyle('1970 Plymouth Superbird')).toBeNull();
  });

  it('handles empty input', () => {
    expect(inferBodyStyle('')).toBeNull();
    expect(inferBodyStyle(null)).toBeNull();
    expect(inferBodyStyle(undefined)).toBeNull();
  });
});
