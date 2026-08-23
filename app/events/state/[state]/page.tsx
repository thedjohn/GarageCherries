import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db';
import { STATE_NAMES, stateCodeFromSlug } from '@/lib/usStates';
import { resolveZipCoords, boundingBox, haversineMiles } from '@/lib/geo';
import { CarShowEvent, EventCard } from '../../page';
import SubmitEventForm from '../../SubmitEventForm';
import EventFilters from '@/components/EventFilters';
import Pagination from '@/components/Pagination';

export const revalidate = 0;
const PAGE_SIZE = 20;
const NEARBY_RADIUS_MILES = 50;

interface Props {
  params: Promise<{ state: string }>;
  searchParams: Promise<{ page?: string; city?: string; zip?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state: stateSlugParam } = await params;
  const code = stateCodeFromSlug(stateSlugParam);
  if (!code) return {};

  const admin = createAdminClient();
  const { count } = await admin.from('events').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('state', code);
  const stateName = STATE_NAMES[code];
  const year = new Date().getFullYear();

  return {
    title: `${stateName} Car Shows & Events ${year}`,
    description: `${count ?? 0} upcoming car shows, cruise-ins, swap meets, and auctions in ${stateName} for ${year} — dates, locations, and details for ${stateName} classic car events.`,
    alternates: { canonical: `https://www.garagecherries.com/events/state/${stateSlugParam}` },
  };
}

export default async function StateEventsPage({ params, searchParams }: Props) {
  const { state: stateSlugParam } = await params;
  const sp = await searchParams;
  const code = stateCodeFromSlug(stateSlugParam);
  if (!code) notFound();
  const stateName = STATE_NAMES[code];
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const zipCoords = sp.zip ? resolveZipCoords(sp.zip) : null;

  const admin = createAdminClient();

  const applyCity = <T,>(q: T): T => {
    let query = q as any;
    if (sp.city) query = query.ilike('location', `%${sp.city}%`);
    return query;
  };

  // Featured events are a small curated set by design -- always shown in full,
  // never subject to page/.range() (see app/events/page.tsx for the same pattern,
  // including respecting the ZIP radius below so a "Featured" event hundreds of
  // miles away doesn't undercut a "near me" search).
  let featuredQuery = admin.from('events').select('*').eq('status', 'approved').eq('state', code).eq('featured', true).order('date', { ascending: true });
  featuredQuery = applyCity(featuredQuery);

  let events: CarShowEvent[];
  let totalCount: number;
  let totalPages: number;
  let featured: CarShowEvent[];
  let cityOptions: string[];

  const locationRowsPromise = fetchAllRows<{ location: string }>((from, to) =>
    admin.from('events').select('location').eq('status', 'approved').eq('state', code).order('location').range(from, to)
  );

  if (zipCoords) {
    // Same hybrid pattern as app/events/page.tsx: PostgREST can't sort by a
    // computed haversine expression, so a resolved ZIP switches this page to a
    // cheap DB-side bounding-box pre-filter + exact JS-side distance sort/paginate,
    // additionally scoped to this route's fixed state.
    const box = boundingBox(zipCoords.lat, zipCoords.lng, NEARBY_RADIUS_MILES);
    featuredQuery = featuredQuery
      .not('lat', 'is', null).not('lng', 'is', null)
      .gte('lat', box.minLat).lte('lat', box.maxLat).gte('lng', box.minLng).lte('lng', box.maxLng);
    const [nearbyRows, { data: featuredData }, locationRows] = await Promise.all([
      fetchAllRows<CarShowEvent>((from, to) => {
        let q = admin.from('events').select('*').eq('status', 'approved').eq('state', code).eq('featured', false)
          .not('lat', 'is', null).not('lng', 'is', null)
          .gte('lat', box.minLat).lte('lat', box.maxLat).gte('lng', box.minLng).lte('lng', box.maxLng)
          .range(from, to);
        return applyCity(q);
      }),
      featuredQuery,
      locationRowsPromise,
    ]);
    const withinRadius = nearbyRows
      .map(e => ({ event: e, miles: haversineMiles(zipCoords.lat, zipCoords.lng, e.lat!, e.lng!) }))
      .filter(r => r.miles <= NEARBY_RADIUS_MILES)
      .sort((a, b) => a.miles - b.miles);
    totalCount = withinRadius.length;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    events = withinRadius.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(r => r.event);
    featured = (featuredData ?? []).filter(e => haversineMiles(zipCoords.lat, zipCoords.lng, e.lat!, e.lng!) <= NEARBY_RADIUS_MILES);
    cityOptions = [...new Set(locationRows.map(r => r.location.split(',')[0].trim()))].sort();
  } else {
    let mainQuery = admin.from('events').select('*', { count: 'exact' }).eq('status', 'approved').eq('state', code).eq('featured', false).order('date', { ascending: true });
    mainQuery = applyCity(mainQuery);
    mainQuery = mainQuery.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const [{ data: featuredData }, { data, count }, locationRows] = await Promise.all([
      featuredQuery,
      mainQuery,
      locationRowsPromise,
    ]);
    events = data ?? [];
    totalCount = count ?? 0;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    featured = featuredData ?? [];
    cityOptions = [...new Set(locationRows.map(r => r.location.split(',')[0].trim()))].sort();
  }

  const now = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= now);
  const past = events.filter(e => e.date < now);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.garagecherries.com' },
      { '@type': 'ListItem', position: 2, name: 'Events', item: 'https://www.garagecherries.com/events' },
      { '@type': 'ListItem', position: 3, name: `${stateName} Events`, item: `https://www.garagecherries.com/events/state/${stateSlugParam}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="max-w-5xl mx-auto px-4 py-12">
        <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
          <Link href="/events" className="hover:text-red-600 transition-colors">Events</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-zinc-700">{stateName}</span>
        </nav>

        <div className="mb-10">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">{stateName} Car Shows & Events</h1>
          <p className="text-lg text-zinc-500 max-w-2xl">
            Classic car shows, auctions, swap meets, and cruise nights in {stateName} for {new Date().getFullYear()}.
          </p>
          <Link href={`/listings?state=${code}`} className="inline-block mt-3 text-sm font-semibold text-red-600 hover:underline">
            Browse cars for sale in {stateName} →
          </Link>
        </div>

        <EventFilters basePath={`/events/state/${stateSlugParam}`} hideStateSelect cityOptions={cityOptions} />

        {totalCount === 0 && featured.length === 0 && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
            <p className="text-4xl mb-4">📅</p>
            <h2 className="text-xl font-bold text-zinc-800 mb-2">
              {sp.zip ? `No ${stateName} events within 50 miles of ${sp.zip}` : sp.city ? `No ${stateName} events match "${sp.city}"` : `No ${stateName} events listed yet`}
            </h2>
            <p className="text-zinc-500 text-sm mb-4">
              {sp.zip ? 'Try a different ZIP, or browse every event in this state.' : sp.city ? 'Try a different city, or browse every event in this state.' : 'Check back soon, or browse events in every state.'}
            </p>
            <Link href={(sp.zip || sp.city) ? `/events/state/${stateSlugParam}` : '/events'} className="text-red-600 hover:underline text-sm font-semibold">
              {(sp.zip || sp.city) ? `Browse all ${stateName} events` : 'Browse all events'}
            </Link>
          </div>
        )}

        {featured.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Featured Events</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {featured.map(e => <EventCard key={e.id} event={e} highlight />)}
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Upcoming Events</h2>
            <div className="space-y-3">
              {upcoming.filter(e => !e.featured).map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}

        {past.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Past Events</h2>
            <div className="space-y-3 opacity-60">
              {past.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}

        <Pagination currentPage={page} totalPages={totalPages} basePath={`/events/state/${stateSlugParam}`} searchParams={sp} />

        <SubmitEventForm />

        <div className="mt-10 pt-8 border-t border-zinc-100">
          <Link href="/events" className="text-sm text-zinc-400 hover:text-red-600 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            All States & Events
          </Link>
        </div>

        <p className="mt-8 text-xs text-zinc-400 text-center">
          Dates are subject to change. Verify with organizers before making travel arrangements.
          GarageCherries is not affiliated with any listed event.
        </p>
      </div>
    </>
  );
}
