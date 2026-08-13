import { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import SubmitEventForm from './SubmitEventForm';
import EventFilters from '@/components/EventFilters';
import { stateSlug, STATE_NAMES } from '@/lib/usStates';

export const revalidate = 0;

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
  searchParams: Promise<{ state?: string; type?: string }>;
}

export default async function EventsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const admin = createAdminClient();
  let query = admin
    .from('events')
    .select('*')
    .eq('status', 'approved')
    .order('date', { ascending: true });
  if (sp.state) query = query.eq('state', sp.state);
  if (sp.type) query = query.eq('type', sp.type);
  const [{ data }, { data: allStateRows }] = await Promise.all([
    query,
    admin.from('events').select('state').eq('status', 'approved'),
  ]);

  const events: CarShowEvent[] = data ?? [];
  const stateCounts = new Map<string, number>();
  for (const row of allStateRows ?? []) stateCounts.set(row.state, (stateCounts.get(row.state) ?? 0) + 1);
  const statesWithEvents = [...stateCounts.entries()].sort((a, b) => b[1] - a[1]);
  const hasActiveFilters = !!(sp.state || sp.type);
  const now = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= now);
  const past = events.filter(e => e.date < now);
  const featured = upcoming.filter(e => e.featured);

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Car Show Calendar</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Major classic car shows, auctions, swap meets, and cruise nights across the USA for {new Date().getFullYear()}.
        </p>
      </div>

      <EventFilters />

      {events.length === 0 && hasActiveFilters && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">📅</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">No events match your filters</h2>
          <p className="text-zinc-500 text-sm mb-4">Try a different state or event type.</p>
          <Link href="/events" className="text-red-600 hover:underline text-sm font-semibold">Clear filters</Link>
        </div>
      )}

      {events.length === 0 && !hasActiveFilters && (
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

      <SubmitEventForm />

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
      {event.image && (
        <img src={event.image} alt="" className="hidden sm:block shrink-0 w-20 h-20 object-cover rounded-lg" />
      )}
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
    </div>
  );
}
