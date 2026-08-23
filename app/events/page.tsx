import { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import SubmitEventForm from './SubmitEventForm';
import EventFilters from '@/components/EventFilters';
import Pagination from '@/components/Pagination';
import { stateSlug, STATE_NAMES } from '@/lib/usStates';
import { resolveZipCoords, boundingBox, haversineMiles } from '@/lib/geo';
import { fetchAllRows } from '@/lib/db';

export const revalidate = 0;
const PAGE_SIZE = 20;
const NEARBY_RADIUS_MILES = 50;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ state?: string; type?: string }> }): Promise<Metadata> {
  const sp = await searchParams;
  return {
    title: `Classic Car Shows & Events ${new Date().getFullYear()}`,
    description: 'Upcoming classic car shows, swap meets, and cruise nights from the GarageCherries community. Browse dates and locations to find classic car events near you.',
    // A ?state= filter has a real, dedicated page at /events/state/[state] with
    // its own title/description/real event count -- point the canonical there
    // instead of at this generic page, so Google consolidates ranking signal
    // onto the real page rather than seeing two versions of the same content.
    // This page's own behavior/rendering for users is unchanged either way.
    alternates: {
      canonical: sp.state
        ? `https://www.garagecherries.com/events/state/${stateSlug(sp.state)}`
        : 'https://www.garagecherries.com/events',
    },
  };
}

export interface CarShowEvent {
  id: string; name: string; slug?: string | null; date: string; end_date?: string | null;
  start_time?: string | null; end_time?: string | null;
  street?: string | null; location: string; state: string; zip?: string | null;
  lat?: number | null; lng?: number | null;
  type: 'show' | 'swap-meet' | 'cruise' | 'auction';
  featured: boolean; description: string; url?: string | null; status: string;
  image?: string | null;
}

export const TYPE_LABELS: Record<CarShowEvent['type'], string> = {
  'show': 'Car Show', 'swap-meet': 'Swap Meet', 'cruise': 'Cruise Night', 'auction': 'Auction',
};
export const TYPE_COLORS: Record<CarShowEvent['type'], string> = {
  'show': 'bg-blue-100 text-blue-700', 'swap-meet': 'bg-amber-100 text-amber-700',
  'cruise': 'bg-green-100 text-green-700', 'auction': 'bg-purple-100 text-purple-700',
};

export function formatEventDate(date: string, endDate?: string | null) {
  const start = new Date(date + 'T12:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!endDate) return `${fmt(start)}, ${start.getFullYear()}`;
  const end = new Date(endDate + 'T12:00:00');
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function formatTimeRange(start?: string | null, end?: string | null) {
  if (!start) return null;
  return end ? `${formatTime(start)} – ${formatTime(end)}` : formatTime(start);
}

interface Props {
  searchParams: Promise<{ state?: string; type?: string; city?: string; zip?: string; page?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const admin = createAdminClient();
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const zipCoords = sp.zip ? resolveZipCoords(sp.zip) : null;

  const applyFilters = <T,>(q: T): T => {
    let query = q as any;
    if (sp.state) query = query.eq('state', sp.state);
    if (sp.type) query = query.eq('type', sp.type);
    if (sp.city) query = query.ilike('location', `%${sp.city}%`);
    return query;
  };

  // Featured events are a small curated set by design -- always shown in full,
  // never subject to page/.range() (a far-future featured event could otherwise
  // fall outside page 1's window and simply vanish). When a ZIP is active, they
  // still respect the same distance radius as the main list -- otherwise a
  // "Featured" event hundreds of miles away would undercut a "near me" search.
  let featuredQuery = admin.from('events').select('*').eq('status', 'approved').eq('featured', true).order('date', { ascending: true });
  featuredQuery = applyFilters(featuredQuery);

  let events: CarShowEvent[];
  let totalCount: number;
  let totalPages: number;

  if (zipCoords) {
    // PostgREST can't sort by a computed haversine expression, so a resolved
    // ZIP switches this page from DB-.range() pagination to: a cheap bounding-
    // box pre-filter pushed down to the DB, exact distance computed in JS over
    // that (small) candidate set, then JS-side sort/paginate.
    const box = boundingBox(zipCoords.lat, zipCoords.lng, NEARBY_RADIUS_MILES);
    featuredQuery = featuredQuery
      .not('lat', 'is', null).not('lng', 'is', null)
      .gte('lat', box.minLat).lte('lat', box.maxLat).gte('lng', box.minLng).lte('lng', box.maxLng);
    const nearbyRows = await fetchAllRows<CarShowEvent>((from, to) => {
      let q = admin.from('events').select('*').eq('status', 'approved').eq('featured', false)
        .not('lat', 'is', null).not('lng', 'is', null)
        .gte('lat', box.minLat).lte('lat', box.maxLat).gte('lng', box.minLng).lte('lng', box.maxLng)
        .range(from, to);
      return applyFilters(q);
    });
    const withinRadius = nearbyRows
      .map(e => ({ event: e, miles: haversineMiles(zipCoords.lat, zipCoords.lng, e.lat!, e.lng!) }))
      .filter(r => r.miles <= NEARBY_RADIUS_MILES)
      .sort((a, b) => a.miles - b.miles);
    totalCount = withinRadius.length;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    events = withinRadius.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(r => r.event);
  } else {
    let mainQuery = admin.from('events').select('*', { count: 'exact' }).eq('status', 'approved').eq('featured', false).order('date', { ascending: true });
    mainQuery = applyFilters(mainQuery);
    mainQuery = mainQuery.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    const { data, count } = await mainQuery;
    events = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  }

  const { data: featuredData } = await featuredQuery;
  // Per-state counts for "Browse by State" -- head:true count-only queries
  // return no rows, so they aren't subject to Supabase's 1000-row select cap
  // the way fetching every row's `state` column and tallying in JS would be.
  const stateCountPairs = await Promise.all(
    Object.keys(STATE_NAMES).map(async code => {
      const { count: c } = await admin.from('events').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('state', code);
      return [code, c ?? 0] as const;
    })
  );
  const statesWithEvents = stateCountPairs.filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);

  const featured: CarShowEvent[] = zipCoords
    ? (featuredData ?? []).filter(e => haversineMiles(zipCoords.lat, zipCoords.lng, e.lat!, e.lng!) <= NEARBY_RADIUS_MILES)
    : (featuredData ?? []);
  const hasActiveFilters = !!(sp.state || sp.type || sp.city || sp.zip);
  const now = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= now);
  const past = events.filter(e => e.date < now);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Car Show Calendar</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Major classic car shows, auctions, swap meets, and cruise nights across the USA for {new Date().getFullYear()}.
        </p>
      </div>

      <SubmitEventForm />

      <EventFilters />

      {totalCount === 0 && featured.length === 0 && hasActiveFilters && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">📅</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No events match your filters</h2>
          <p className="text-zinc-500 text-sm mb-4">Try a different state, city, or event type.</p>
          <Link href="/events" className="text-red-600 hover:underline text-sm font-semibold">Clear filters</Link>
        </div>
      )}

      {totalCount === 0 && featured.length === 0 && !hasActiveFilters && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">📅</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No events listed yet</h2>
          <p className="text-zinc-500 text-sm">Check back soon — we&apos;ll be adding classic car shows, auctions, and cruise nights here.</p>
        </div>
      )}

      {featured.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Featured Events</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {featured.map(e => (
              <EventCard key={e.id} event={e} highlight />
            ))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Upcoming Events</h2>
          <div className="space-y-3">
            {upcoming.filter(e => !e.featured).map(e => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Past Events</h2>
          <div className="space-y-3 opacity-60">
            {past.map(e => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} basePath="/events" searchParams={sp} />

      {statesWithEvents.length > 0 && (
        <div className="mb-10">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Browse by State</h2>
          <div className="flex flex-wrap gap-2">
            {statesWithEvents.map(([code, count]) => (
              <Link
                key={code}
                href={`/events/state/${stateSlug(code)}`}
                className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-sm text-zinc-600 hover:border-red-300 hover:text-red-600 transition-colors"
              >
                {STATE_NAMES[code] ?? code} <span className="text-zinc-400">({count})</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-zinc-400 text-center">
        Dates are subject to change. Verify with organizers before making travel arrangements.
        GarageCherries is not affiliated with any listed event.
      </p>
    </div>
  );
}

export function EventCard({ event, highlight }: { event: CarShowEvent; highlight?: boolean }) {
  return (
    <div className={`bg-white border rounded-xl p-5 flex gap-4 items-start ${highlight ? 'border-red-200 shadow-sm' : 'border-zinc-100'}`}>
      <div className="shrink-0 text-center bg-zinc-50 rounded-lg px-3 py-2 min-w-[56px]">
        <p className="text-xs font-bold text-zinc-400 uppercase">
          {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
        </p>
        <p className="text-xl font-extrabold text-zinc-900 leading-none">
          {new Date(event.date + 'T12:00:00').getDate()}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${TYPE_COLORS[event.type]}`}>
            {TYPE_LABELS[event.type]}
          </span>
          {highlight && (
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-600">Featured</span>
          )}
        </div>
        <h3 className="font-bold text-zinc-900 text-sm leading-snug">
          {event.slug ? (
            <Link href={`/events/${event.slug}`} className="hover:text-red-600 transition-colors">
              {event.name}
            </Link>
          ) : event.name}
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {formatEventDate(event.date, event.end_date)}
          {formatTimeRange(event.start_time, event.end_time) && (
            <> · {formatTimeRange(event.start_time, event.end_time)}</>
          )}
          {' · '}{event.location}, {event.state}
        </p>
        {event.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{event.description}</p>
        )}
      </div>
      {event.image && (
        <img src={event.image} alt="" className="hidden sm:block shrink-0 w-20 h-20 object-cover rounded-lg" />
      )}
    </div>
  );
}
