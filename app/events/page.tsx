import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Classic Car Shows & Events 2026 | GarageCherries',
  description: 'Upcoming classic car shows, swap meets, and cruise nights across the US. Find events near you.',
  alternates: { canonical: 'https://www.garagecherries.com/events' },
};

interface CarShowEvent {
  id: string; name: string; date: string; endDate?: string; location: string;
  state: string; type: 'show' | 'swap-meet' | 'cruise' | 'auction'; featured?: boolean;
  description: string; url?: string;
}

const EVENTS: CarShowEvent[] = [];

const TYPE_LABELS: Record<CarShowEvent['type'], string> = {
  'show': 'Car Show', 'swap-meet': 'Swap Meet', 'cruise': 'Cruise Night', 'auction': 'Auction',
};
const TYPE_COLORS: Record<CarShowEvent['type'], string> = {
  'show': 'bg-blue-100 text-blue-700', 'swap-meet': 'bg-amber-100 text-amber-700',
  'cruise': 'bg-green-100 text-green-700', 'auction': 'bg-purple-100 text-purple-700',
};

function formatEventDate(date: string, endDate?: string) {
  const start = new Date(date + 'T12:00:00');
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!endDate) return `${fmt(start)}, ${start.getFullYear()}`;
  const end = new Date(endDate + 'T12:00:00');
  return `${fmt(start)} – ${fmt(end)}, ${start.getFullYear()}`;
}

const sorted = [...EVENTS].sort((a, b) => {
  const now = new Date().toISOString().slice(0, 10);
  const aFuture = a.date >= now;
  const bFuture = b.date >= now;
  if (aFuture && !bFuture) return -1;
  if (!aFuture && bFuture) return 1;
  return a.date.localeCompare(b.date);
});

const featured = sorted.filter(e => e.featured);
const all = sorted;

export default function EventsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Car Show Calendar</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Major classic car shows, auctions, swap meets, and cruise nights across the US for 2026.
        </p>
      </div>

      {/* Empty state */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
        <p className="text-4xl mb-4">📅</p>
        <h2 className="text-xl font-bold text-zinc-800 mb-2">No events listed yet</h2>
        <p className="text-zinc-500 text-sm">Check back soon — we'll be adding classic car shows, auctions, and cruise nights here.</p>
      </div>

      {/* Submit CTA */}
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
