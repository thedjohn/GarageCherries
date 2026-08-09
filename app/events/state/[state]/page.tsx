import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { STATE_NAMES, stateCodeFromSlug } from '@/lib/usStates';
import { CarShowEvent, EventCard } from '../../page';
import SubmitEventForm from '../../SubmitEventForm';

export const revalidate = 0;

interface Props {
  params: Promise<{ state: string }>;
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

export default async function StateEventsPage({ params }: Props) {
  const { state: stateSlugParam } = await params;
  const code = stateCodeFromSlug(stateSlugParam);
  if (!code) notFound();
  const stateName = STATE_NAMES[code];

  const admin = createAdminClient();
  const { data } = await admin
    .from('events')
    .select('*')
    .eq('status', 'approved')
    .eq('state', code)
    .order('date', { ascending: true });

  const events: CarShowEvent[] = data ?? [];
  const now = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= now);
  const past = events.filter(e => e.date < now);
  const featured = upcoming.filter(e => e.featured);

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

        {events.length === 0 && (
          <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
            <p className="text-4xl mb-4">📅</p>
            <h2 className="text-xl font-bold text-zinc-800 mb-2">No {stateName} events listed yet</h2>
            <p className="text-zinc-500 text-sm mb-4">Check back soon, or browse events in every state.</p>
            <Link href="/events" className="text-red-600 hover:underline text-sm font-semibold">Browse all events</Link>
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
