import type { Car } from '@/lib/types';
import { STATE_NAMES } from '@/lib/usStates';
import { neighborStates } from '@/lib/stateNeighbors';

// Listings shown on event pages (and the /events index, state pages) so a
// visitor who lands on one event from search has a relevant next click into
// inventory. Matching order: the event's make/model theme (if its name says
// it's e.g. a Mopar or Corvette show, closest first), then same-state and
// neighboring-state listings, then featured/newest as a fallback -- so the
// block is never empty while any active listing exists.

export interface EventTheme {
  // Plural noun used in the heading, e.g. "Mopars" -> "Mopars for sale".
  label: string;
  makes: string[];
  // Matched as a prefix (ilike 'Corvette%') since model strings vary by feed.
  model?: string;
  // /listings link for "Browse all". Multi-make themes (Mopar) pass a
  // comma-separated make list; model themes use a text search since model
  // names vary ("Corvette Stingray", "Corvette C3").
  browseHref: string;
}

// Order matters: model-level themes come before their make, so a "Corvettes
// at the Chevy dealer" show is a Corvette show. Word boundaries keep e.g.
// "Stratford" from matching Ford.
const THEMES: { pattern: RegExp; theme: EventTheme }[] = [
  { pattern: /\bcorvettes?\b|\bvettes?\b/i, theme: { label: 'Corvettes', makes: ['Chevrolet'], model: 'Corvette', browseHref: '/listings?q=Corvette' } },
  { pattern: /\bcamaros?\b/i, theme: { label: 'Camaros', makes: ['Chevrolet'], model: 'Camaro', browseHref: '/listings?q=Camaro' } },
  { pattern: /\bmustangs?\b/i, theme: { label: 'Mustangs', makes: ['Ford'], model: 'Mustang', browseHref: '/listings?q=Mustang' } },
  { pattern: /\bthunderbirds?\b|\bt-birds?\b/i, theme: { label: 'Thunderbirds', makes: ['Ford'], model: 'Thunderbird', browseHref: '/listings?q=Thunderbird' } },
  { pattern: /\bmopars?\b/i, theme: { label: 'Mopars', makes: ['Dodge', 'Plymouth', 'Chrysler', 'DeSoto'], browseHref: '/listings?make=Dodge,Plymouth,Chrysler,DeSoto' } },
  { pattern: /\bpontiacs?\b|\bgto\b/i, theme: { label: 'Pontiacs', makes: ['Pontiac'], browseHref: '/listings?make=Pontiac' } },
  { pattern: /\bchevy\b|\bchevys\b|\bchevrolets?\b/i, theme: { label: 'Chevys', makes: ['Chevrolet'], browseHref: '/listings?make=Chevrolet' } },
  { pattern: /\bfords?\b/i, theme: { label: 'Fords', makes: ['Ford'], browseHref: '/listings?make=Ford' } },
  { pattern: /\bbuicks?\b/i, theme: { label: 'Buicks', makes: ['Buick'], browseHref: '/listings?make=Buick' } },
  { pattern: /\bcadillacs?\b|\bcaddys?\b/i, theme: { label: 'Cadillacs', makes: ['Cadillac'], browseHref: '/listings?make=Cadillac' } },
  { pattern: /\boldsmobiles?\b/i, theme: { label: 'Oldsmobiles', makes: ['Oldsmobile'], browseHref: '/listings?make=Oldsmobile' } },
  { pattern: /\bstudebakers?\b/i, theme: { label: 'Studebakers', makes: ['Studebaker'], browseHref: '/listings?make=Studebaker' } },
  { pattern: /\bporsches?\b/i, theme: { label: 'Porsches', makes: ['Porsche'], browseHref: '/listings?make=Porsche' } },
  { pattern: /\bvw\b|\bvolkswagens?\b/i, theme: { label: 'Volkswagens', makes: ['Volkswagen'], browseHref: '/listings?make=Volkswagen' } },
  { pattern: /\bjaguars?\b/i, theme: { label: 'Jaguars', makes: ['Jaguar'], browseHref: '/listings?make=Jaguar' } },
  { pattern: /\bjeeps?\b/i, theme: { label: 'Jeeps', makes: ['Jeep'], browseHref: '/listings?make=Jeep' } },
];

// Only the event name is checked -- descriptions of general shows often list
// several makes ("Mopar, Ford, and Chevy welcome"), which would mislabel them.
export function detectEventTheme(name: string): EventTheme | null {
  for (const { pattern, theme } of THEMES) {
    if (pattern.test(name)) return theme;
  }
  return null;
}

export type ListingsMatch = 'theme' | 'local' | 'fallback';

export interface ListingsBlock {
  cars: Car[];
  match: ListingsMatch;
  heading: string;
  browseHref: string;
  browseLabel: string;
}

export const PAST_EVENT_HEADING = 'Seen something you liked? Browse similar cars';

// A tier (theme, or in-state + nearby) is only used if it can fill at least
// this many cards; otherwise the next tier is tried. Keeps a lone card from
// standing in for a whole block.
export const MIN_TIER_CARDS = 2;

function usable(pool: Car[] | undefined, seen: Set<string>): Car[] {
  const out: Car[] = [];
  for (const car of pool ?? []) {
    if (seen.has(car.id) || !car.images?.[0]) continue;
    seen.add(car.id);
    out.push(car);
  }
  return out;
}

// Pure selection. Cards come from ONE tier only, so the heading always
// describes every card under it (a Missouri truck never appears under "Cars
// for sale in New York"):
//   1. theme   -- the event's make/model, closest first (same state, then
//                 neighboring states, then anywhere)
//   2. local   -- same state, then neighboring states
//   3. fallback -- featured/newest nationwide
// A tier with fewer than MIN_TIER_CARDS usable cars is skipped. Duplicates
// and cars without a photo (CarCard needs images[0]) are dropped. Returns
// null only when every pool is empty, so callers never render an empty block.
export function pickListings(
  pools: { theme?: Car[]; state?: Car[]; nearby?: Car[]; fallback: Car[] },
  opts: { theme?: EventTheme | null; state?: string | null; max?: number; isPast?: boolean },
): ListingsBlock | null {
  const max = opts.max ?? 4;
  const state = opts.state ?? null;
  const neighbors = neighborStates(state);
  const stateName = state ? (STATE_NAMES[state] ?? state) : null;

  let cars: Car[] = [];
  let match: ListingsMatch | null = null;
  let heading = '';
  let browseHref = '/listings';
  let browseLabel = 'Browse all listings';

  if (opts.theme) {
    // Stable sort by distance tier, keeping the featured/newest order within each.
    const rank = (c: Car) => (c.state === state ? 0 : neighbors.includes(c.state) ? 1 : 2);
    const sorted = usable(pools.theme, new Set()).map((c, i) => ({ c, i }))
      .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map(x => x.c);
    if (sorted.length >= MIN_TIER_CARDS) {
      cars = sorted.slice(0, max);
      match = 'theme';
      heading = `${opts.theme.label} for sale`;
      browseHref = opts.theme.browseHref;
      browseLabel = `Browse all ${opts.theme.label}`;
    }
  }

  if (!match && state) {
    const seen = new Set<string>();
    const inState = usable(pools.state, seen);
    const nearby = usable(pools.nearby, seen).filter(c => neighbors.includes(c.state));
    const local = [...inState, ...nearby].slice(0, max);
    if (local.length >= MIN_TIER_CARDS) {
      cars = local;
      match = 'local';
      const anyInState = local.some(c => c.state === state);
      const anyNearby = local.some(c => c.state !== state);
      heading = anyInState && anyNearby ? `Cars for sale in and near ${stateName}`
        : anyInState ? `Cars for sale in ${stateName}`
        : `Cars for sale near ${stateName}`;
      if (anyInState) {
        browseHref = `/listings?state=${encodeURIComponent(state)}`;
        browseLabel = `Browse all cars for sale in ${stateName}`;
      }
    }
  }

  if (!match) {
    const fallback = usable(pools.fallback, new Set()).slice(0, max);
    if (fallback.length === 0) return null;
    cars = fallback;
    match = 'fallback';
    heading = 'Featured cars for sale';
  }

  if (opts.isPast) heading = PAST_EVENT_HEADING;
  return { cars, match, heading, browseHref, browseLabel };
}

export const LISTING_CARD_COLUMNS = 'id,slug,title,year,make,model,price,mileage,location,state,condition,body_style,transmission,engine,images,featured,listed_at';

export function rowToCar(r: Record<string, unknown>): Car {
  return {
    id: r.id as string, slug: r.slug as string, title: r.title as string,
    year: Number(r.year), make: r.make as string, model: r.model as string,
    price: Number(r.price), mileage: r.mileage != null ? Number(r.mileage) : null,
    location: (r.location as string) ?? '', state: (r.state as string) ?? '',
    condition: (r.condition as string) ?? null, bodyStyle: (r.body_style as string) ?? '',
    transmission: (r.transmission as string) ?? '', engine: (r.engine as string) ?? null,
    color: null, images: (r.images as string[]) ?? [], description: '',
    sellerId: '', sellerName: '', sellerPhone: '',
    featured: (r.featured as boolean) ?? false, listedAt: (r.listed_at as string) ?? '',
  };
}

// Fetches the pools in parallel (each a small capped query) and picks from
// them. Pools are over-fetched so de-duplication and the no-photo skip can
// still fill `max` cards. The theme is queried twice -- once limited to the
// event's state and its neighbors, once nationwide -- so nearby matches are
// found even when the nationwide top-N is all far away.
export async function getEventListings(
  // Typed loosely, same as the query helpers in lib/eventDates.ts.
  supabase: any,
  opts: { theme?: EventTheme | null; state?: string | null; max?: number; isPast?: boolean },
): Promise<ListingsBlock | null> {
  const max = opts.max ?? 4;
  const poolSize = max * 2;
  const now = new Date().toISOString();
  const neighbors = neighborStates(opts.state);
  const empty = Promise.resolve({ data: [] });
  const active = () => supabase.from('listings').select(LISTING_CARD_COLUMNS)
    .eq('status', 'approved').eq('is_sold', false)
    .or(`expires_at.is.null,expires_at.gt.${now}`);
  const newestFirst = (q: any) => q.order('featured', { ascending: false }).order('listed_at', { ascending: false }).limit(poolSize);
  const themed = () => {
    let q = active().in('make', opts.theme!.makes);
    if (opts.theme!.model) q = q.ilike('model', `${opts.theme!.model}%`);
    return q;
  };

  const [{ data: themeLocalRows }, { data: themeRows }, { data: stateRows }, { data: nearbyRows }, { data: fallbackRows }] = await Promise.all([
    opts.theme && opts.state ? newestFirst(themed().in('state', [opts.state, ...neighbors])) : empty,
    opts.theme ? newestFirst(themed()) : empty,
    opts.state ? newestFirst(active().eq('state', opts.state)) : empty,
    neighbors.length > 0 ? newestFirst(active().in('state', neighbors)) : empty,
    newestFirst(active()),
  ]);
  return pickListings(
    {
      theme: [...(themeLocalRows ?? []), ...(themeRows ?? [])].map(rowToCar),
      state: (stateRows ?? []).map(rowToCar),
      nearby: (nearbyRows ?? []).map(rowToCar),
      fallback: (fallbackRows ?? []).map(rowToCar),
    },
    opts,
  );
}
