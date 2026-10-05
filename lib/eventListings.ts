import type { Car } from '@/lib/types';
import { STATE_NAMES } from '@/lib/usStates';

// Listings shown on event pages (and the /events index, state pages) so a
// visitor who lands on one event from search has a relevant next click into
// inventory. Matching order: the event's make/model theme (if its name says
// it's e.g. a Mopar or Corvette show), then same-state listings, then
// featured/newest as a fallback -- so the block is never empty while any
// active listing exists.

export interface EventTheme {
  // Plural noun used in the heading, e.g. "Mopars" -> "Mopars for sale".
  label: string;
  makes: string[];
  // Matched as a prefix (ilike 'Corvette%') since model strings vary by feed.
  model?: string;
  // /listings link for "Browse all"; /listings only filters one exact make,
  // so multi-make themes (Mopar) use a text search instead.
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
  { pattern: /\bmopars?\b/i, theme: { label: 'Mopars', makes: ['Dodge', 'Plymouth', 'Chrysler', 'DeSoto'], browseHref: '/listings?q=Mopar' } },
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

export type ListingsMatch = 'theme' | 'state' | 'fallback';

export interface ListingsBlock {
  cars: Car[];
  match: ListingsMatch;
  heading: string;
  browseHref: string;
  browseLabel: string;
}

export const PAST_EVENT_HEADING = 'Seen something you liked? Browse similar cars';

// Pure selection: fills up to `max` cards from the pools in priority order,
// skipping duplicates and cars without a photo (CarCard needs images[0]).
// The heading/link follow whichever pool supplied the first card. Returns
// null only when every pool is empty, so callers never render an empty block.
export function pickListings(
  pools: { theme?: Car[]; state?: Car[]; fallback: Car[] },
  opts: { theme?: EventTheme | null; state?: string | null; max?: number; isPast?: boolean },
): ListingsBlock | null {
  const max = opts.max ?? 4;
  const seen = new Set<string>();
  const cars: Car[] = [];
  let match: ListingsMatch | null = null;

  const take = (pool: Car[] | undefined, kind: ListingsMatch) => {
    for (const car of pool ?? []) {
      if (cars.length >= max) return;
      if (seen.has(car.id) || !car.images?.[0]) continue;
      seen.add(car.id);
      cars.push(car);
      match ??= kind;
    }
  };
  if (opts.theme) take(pools.theme, 'theme');
  if (opts.state) take(pools.state, 'state');
  take(pools.fallback, 'fallback');

  if (cars.length === 0 || !match) return null;

  const stateName = opts.state ? (STATE_NAMES[opts.state] ?? opts.state) : null;
  let heading: string;
  let browseHref: string;
  let browseLabel: string;
  if (match === 'theme' && opts.theme) {
    heading = `${opts.theme.label} for sale`;
    browseHref = opts.theme.browseHref;
    browseLabel = `Browse all ${opts.theme.label}`;
  } else if (match === 'state' && opts.state) {
    heading = `Cars for sale in ${stateName}`;
    browseHref = `/listings?state=${encodeURIComponent(opts.state)}`;
    browseLabel = `Browse all cars for sale in ${stateName}`;
  } else {
    heading = 'Featured cars for sale';
    browseHref = '/listings';
    browseLabel = 'Browse all listings';
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

// Fetches the three pools in parallel (each a small capped query) and picks
// from them. Pools are over-fetched slightly so de-duplication and the
// no-photo skip can still fill `max` cards.
export async function getEventListings(
  // Typed loosely, same as the query helpers in lib/eventDates.ts.
  supabase: any,
  opts: { theme?: EventTheme | null; state?: string | null; max?: number; isPast?: boolean },
): Promise<ListingsBlock | null> {
  const max = opts.max ?? 4;
  const poolSize = max * 2;
  const now = new Date().toISOString();
  const active = () => supabase.from('listings').select(LISTING_CARD_COLUMNS)
    .eq('status', 'approved').eq('is_sold', false)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  const themeQuery = opts.theme
    ? (() => {
        let q = active().in('make', opts.theme!.makes);
        if (opts.theme!.model) q = q.ilike('model', `${opts.theme!.model}%`);
        return q.order('featured', { ascending: false }).order('listed_at', { ascending: false }).limit(poolSize);
      })()
    : Promise.resolve({ data: [] });
  const stateQuery = opts.state
    ? active().eq('state', opts.state).order('featured', { ascending: false }).order('listed_at', { ascending: false }).limit(poolSize)
    : Promise.resolve({ data: [] });
  const fallbackQuery = active().order('featured', { ascending: false }).order('listed_at', { ascending: false }).limit(poolSize);

  const [{ data: themeRows }, { data: stateRows }, { data: fallbackRows }] = await Promise.all([themeQuery, stateQuery, fallbackQuery]);
  return pickListings(
    {
      theme: (themeRows ?? []).map(rowToCar),
      state: (stateRows ?? []).map(rowToCar),
      fallback: (fallbackRows ?? []).map(rowToCar),
    },
    opts,
  );
}
