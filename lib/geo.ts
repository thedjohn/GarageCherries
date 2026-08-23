import { findCoordinates, findByCity } from 'zipcodes-us';

// Approximate geographic center (lat, lng) for each US state -- also used as
// a fallback when an event's free-text location doesn't match a known city.
export const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL:[32.8,-86.8],AK:[64.2,-153.4],AZ:[34.3,-111.1],AR:[34.9,-92.4],CA:[36.8,-119.4],
  CO:[39.0,-105.5],CT:[41.6,-72.7],DE:[39.0,-75.5],FL:[27.8,-81.6],GA:[32.7,-83.4],
  HI:[20.9,-156.9],ID:[44.4,-114.6],IL:[40.0,-89.2],IN:[39.9,-86.3],IA:[42.1,-93.5],
  KS:[38.5,-98.4],KY:[37.5,-85.3],LA:[31.2,-91.8],ME:[45.4,-69.0],MD:[39.1,-76.8],
  MA:[42.2,-71.5],MI:[44.3,-85.4],MN:[46.4,-93.1],MS:[32.7,-89.7],MO:[38.5,-92.5],
  MT:[47.0,-110.0],NE:[41.5,-99.9],NV:[38.5,-117.0],NH:[43.7,-71.6],NJ:[40.1,-74.5],
  NM:[34.5,-106.2],NY:[43.0,-75.5],NC:[35.5,-79.8],ND:[47.5,-100.5],OH:[40.4,-82.8],
  OK:[35.6,-97.5],OR:[44.0,-120.5],PA:[40.6,-77.2],RI:[41.7,-71.5],SC:[33.9,-80.9],
  SD:[44.4,-100.2],TN:[35.9,-86.7],TX:[31.5,-99.3],UT:[39.3,-111.1],VT:[44.0,-72.7],
  VA:[37.8,-79.4],WA:[47.4,-120.5],WV:[38.6,-80.6],WI:[44.3,-89.8],WY:[43.0,-107.6],
  DC:[38.9,-77.0],PR:[18.2,-66.5],GU:[13.4,144.8],VI:[18.3,-64.9],AS:[-14.3,-170.7],MP:[15.1,145.7],
};

export function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export interface Coords { lat: number; lng: number }

// A cheap pre-filter box (in degrees) around a center point, sized to fully
// contain the given radius -- pushed down to the DB via .gte()/.lte() so the
// exact haversineMiles() distance only needs computing over a small candidate
// set afterward, not every row with coordinates.
export function boundingBox(lat: number, lng: number, radiusMiles: number) {
  const latDelta = radiusMiles / 69;
  const lngDelta = radiusMiles / (69 * Math.cos(lat * Math.PI / 180));
  return { minLat: lat - latDelta, maxLat: lat + latDelta, minLng: lng - lngDelta, maxLng: lng + lngDelta };
}

// Resolves a searching user's ZIP code to real coordinates via the
// zipcodes-us static dataset (GeoNames-based, no network calls).
export function resolveZipCoords(zip: string): Coords | null {
  const digits = zip.trim();
  if (!/^\d{5}$/.test(digits)) return null;
  const result = findCoordinates(digits);
  return result.isValid ? { lat: result.latitude, lng: result.longitude } : null;
}

// Resolves an event's approximate coordinates from its free-text `location`
// (already reduced to a primary city name, e.g. via location.split(',')[0])
// and 2-letter `state`. Falls back to the state's centroid when the city
// doesn't match a known place -- car show locations are frequently a venue
// name rather than a real city (e.g. "Ameristar Casino"), so every event
// still resolves to *something* rather than being excluded from distance
// search entirely. When a city matches multiple ZIP codes, the first match
// is used -- precise enough for "events near me," not turn-by-turn routing.
export function resolveEventCoords(city: string, state: string): Coords | null {
  const stateCode = state.trim().toUpperCase();
  const cityName = city.trim();
  if (cityName) {
    const matches = findByCity(cityName, stateCode);
    if (matches.length > 0) {
      return { lat: matches[0].latitude, lng: matches[0].longitude };
    }
  }
  const centroid = STATE_CENTROIDS[stateCode];
  return centroid ? { lat: centroid[0], lng: centroid[1] } : null;
}
