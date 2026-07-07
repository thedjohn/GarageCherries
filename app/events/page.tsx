import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/server';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Classic Car Shows & Events 2026 | GarageCherries',
  description: 'Upcoming classic car shows, swap meets, and cruise nights across the US. Find events near you.',
  alternates: { canonical: 'https://www.garagecherries.com/events' },
};

interface CarShowEvent {
  id: string; name: string; date: string; end_date?: string | null;
  location: string; state: string;
  type: 'show' | 'swap-meet' | 'cruise' | 'auction';
  featured: boolean; description: string; url?: string | null;
}

const TYPE_LABELS: Record<CarShowEvent['type'], string> = {
  'show': 'Car Show', 'swap-meet': 'Swap Meet', 'cruise': 'Cruise Night', 'auction': 'Auction',
};
const TYPE_COLORS: Record<CarShowEvent['type'], string> = {
  'show': 'bg-blue-100 text-blue-700', 'swap-meet': 'bg-amber-100 text-amber-700',
  'cruise': 'bg-green-100 text-green-700', 'auction': 'bg-purple-100 text-purple-700',
};

function formatEventDate(date: string, endDate?: string | null) {
  const start = new Date(date + 'T12:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!endDate) return `${fmt(start)}, ${start.getFullYear()}`;
  const end = new Date(endDate + 'T12:00:00');
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`;
}

export default async function EventsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('events')
    .select('*')
    .order('date', { ascending: true });

  const events: CarShowEvent[] = data ?? [];
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
          Major classic car shows, auctions, swap meets, and cruise nights across the US for 2026.
        </p>
      </div>

      {events.length === 0 && (
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

      <div className="mt-12 bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center">
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Know of an event we missed?</h2>
        <p className="text-sm text-zinc-500 mb-4">Help us keep the calendar complete for the classic car community.</p>
        <a
          href="mailto:events@garagecherries.com?subject=Event submission"
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors"
        >
          Submit an Event
        </a>
      </div>

      <p className="mt-8 text-xs text-zinc-400 text-center">
        Dates are subject to change. Verify with organizers before making travel arrangements.
        GarageCherries is not affiliated with any listed event.
      </p>
    </div>
  );
}

function EventCard({ event, highlight }: { event: CarShowEvent; highlight?: boolean }) {
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
          {event.url ? (
            <a href={event.url} target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-colors">
              {event.name}
            </a>
          ) : event.name}
        </h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {formatEventDate(event.date, event.end_date)} · {event.location}, {event.state}
        </p>
        {event.description && (
          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{event.description}</p>
        )}
      </div>
    </div>
  );
}
