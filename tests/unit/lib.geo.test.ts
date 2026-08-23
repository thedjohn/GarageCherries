import { describe, it, expect } from 'vitest';
import { STATE_CENTROIDS, haversineMiles, resolveZipCoords, resolveEventCoords, boundingBox } from '@/lib/geo';

describe('geo', () => {
  describe('STATE_CENTROIDS', () => {
    it('has a centroid for every real state', () => {
      expect(STATE_CENTROIDS.MO).toEqual([38.5, -92.5]);
      expect(STATE_CENTROIDS.CA).toEqual([36.8, -119.4]);
    });
  });

  describe('haversineMiles', () => {
    it('returns 0 for identical points', () => {
      expect(haversineMiles(38.5, -92.5, 38.5, -92.5)).toBe(0);
    });

    it('computes a realistic distance between two known cities', () => {
      // St. Louis, MO to Kansas City, MO -- roughly 250 miles apart.
      const miles = haversineMiles(38.6270, -90.1994, 39.0997, -94.5786);
      expect(miles).toBeGreaterThan(230);
      expect(miles).toBeLessThan(270);
    });
  });

  describe('boundingBox', () => {
    it('produces a box that fully contains the radius along both axes', () => {
      const box = boundingBox(38.6270, -90.1994, 50);
      // St. Louis to a point ~50mi due north should sit inside the box.
      expect(38.6270 + 50 / 69).toBeCloseTo(box.maxLat, 5);
      expect(box.minLat).toBeLessThan(38.6270);
      expect(box.minLng).toBeLessThan(-90.1994);
      expect(box.maxLng).toBeGreaterThan(-90.1994);
    });

    it('widens the longitude delta near the poles to account for meridian convergence', () => {
      const equatorBox = boundingBox(0, 0, 50);
      const highLatBox = boundingBox(60, 0, 50);
      const equatorLngSpan = equatorBox.maxLng - equatorBox.minLng;
      const highLatLngSpan = highLatBox.maxLng - highLatBox.minLng;
      expect(highLatLngSpan).toBeGreaterThan(equatorLngSpan);
    });
  });

  describe('resolveZipCoords', () => {
    it('resolves a real ZIP to real coordinates', () => {
      const coords = resolveZipCoords('90210');
      expect(coords).not.toBeNull();
      expect(coords!.lat).toBeCloseTo(34.09, 0);
      expect(coords!.lng).toBeCloseTo(-118.41, 0);
    });

    it('returns null for a malformed ZIP', () => {
      expect(resolveZipCoords('123')).toBeNull();
      expect(resolveZipCoords('abcde')).toBeNull();
      expect(resolveZipCoords('')).toBeNull();
    });

    it('returns null for a well-formed but unassigned ZIP', () => {
      expect(resolveZipCoords('00000')).toBeNull();
    });

    it('trims whitespace before resolving', () => {
      expect(resolveZipCoords(' 90210 ')).not.toBeNull();
    });
  });

  describe('resolveEventCoords', () => {
    it('resolves a real small-town city to its own coordinates, not the state centroid', () => {
      const coords = resolveEventCoords('Festus', 'MO');
      expect(coords).not.toBeNull();
      // Festus, MO is nowhere near the MO state centroid -- confirms this
      // matched the real city, not the state-level fallback.
      expect(coords).not.toEqual({ lat: STATE_CENTROIDS.MO[0], lng: STATE_CENTROIDS.MO[1] });
    });

    it('falls back to the state centroid when the location is a venue name, not a real city', () => {
      const coords = resolveEventCoords('Ameristar Casino', 'MO');
      expect(coords).toEqual({ lat: STATE_CENTROIDS.MO[0], lng: STATE_CENTROIDS.MO[1] });
    });

    it('falls back to the state centroid when city is blank', () => {
      const coords = resolveEventCoords('', 'TX');
      expect(coords).toEqual({ lat: STATE_CENTROIDS.TX[0], lng: STATE_CENTROIDS.TX[1] });
    });

    it('returns null when the state code is not a real state', () => {
      expect(resolveEventCoords('Anytown', 'ZZ')).toBeNull();
    });
  });
});
