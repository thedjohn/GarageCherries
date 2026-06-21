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

const EVENTS: CarShowEvent[] = [
  {
    id: 'goodguys-columbus-2026', name: 'Goodguys 28th PPG Nationals', date: '2026-07-04', endDate: '2026-07-06',
    location: 'Ohio Expo Center, Columbus, OH', state: 'OH', type: 'show', featured: true,
    description: 'The largest all-American street rod, custom, and classic truck nationals in the country. 5,000+ cars on display, vendor midway, and Autocross.',
  },
  {
    id: 'woodward-dream-cruise-2026', name: 'Woodward Dream Cruise', date: '2026-08-15',
    location: 'Woodward Avenue, Pontiac to Birmingham, MI', state: 'MI', type: 'cruise', featured: true,
    description: 'The world\'s largest one-day automotive event. A 16-mile stretch of Woodward Avenue becomes home to 40,000 classic cars and 1.5 million spectators.',
  },
  {
    id: 'mecum-harrisburg-2026', name: 'Mecum Harrisburg Auction', date: '2026-08-06', endDate: '2026-08-09',
    location: 'Pennsylvania Farm Show Complex, Harrisburg, PA', state: 'PA', type: 'auction', featured: true,
    description: 'One of the largest classic and collector car auctions in the world. Typically features 2,000+ vehicles over four days.',
  },
  {
    id: 'hot-august-nights-2026', name: 'Hot August Nights', date: '2026-08-04', endDate: '2026-08-09',
    location: 'Sparks Convention Center, Reno, NV', state: 'NV', type: 'show',
    description: 'One of the largest classic car shows in the West. Shows, cruises, concerts, and a charity auction across multiple Reno venues.',
  },
  {
    id: 'carlisle-fall-2026', name: 'Carlisle Fall Collector Car Flea Market & Corral', date: '2026-09-25', endDate: '2026-09-27',
    location: 'Carlisle Fairgrounds, Carlisle, PA', state: 'PA', type: 'swap-meet',
    description: 'One of the largest automotive flea markets on the East Coast. Parts, cars for sale, and vendors from across the country.',
  },
  {
    id: 'sema-2026', name: 'SEMA Show 2026', date: '2026-11-03', endDate: '2026-11-06',
    location: 'Las Vegas Convention Center, Las Vegas, NV', state: 'NV', type: 'show',
    description: 'The premier automotive specialty products trade event. Not open to the general public, but essential viewing for industry participants.',
  },
  {
    id: 'pebble-beach-concours-2026', name: 'Pebble Beach Concours d\'Élégance', date: '2026-08-16',
    location: 'The Lodge at Pebble Beach, Pebble Beach, CA', state: 'CA', type: 'show', featured: true,
    description: 'The world\'s most prestigious classic car competition. Only the rarest and most significant automobiles are invited to compete on the 18th fairway.',
  },
  {
    id: 'barrett-jackson-scottsdale-2026', name: 'Barrett-Jackson Scottsdale', date: '2026-01-18', endDate: '2026-01-26',
    location: 'WestWorld of Scottsdale, Scottsdale, AZ', state: 'AZ', type: 'auction',
    description: 'The World\'s Greatest Collector Car Auctions. January Scottsdale event features 1,800+ vehicles and draws 300,000+ attendees.',
  },
  {
    id: 'goodguys-scottsdale-2026', name: 'Goodguys 10th Southwest Nationals', date: '2026-11-06', endDate: '2026-11-08',
    location: 'WestWorld of Scottsdale, Scottsdale, AZ', state: 'AZ', type: 'show',
    description: 'Thousands of American hot rods, custom cars, and trucks compete for Top 100 status alongside vendor midway and manufacturer displays.',
  },
  {
    id: 'muscle-car-road-trip-indiana', name: 'Indianapolis Muscle Car & Corvette Nationals', date: '2026-09-13', endDate: '2026-09-14',
    location: 'Indiana State Fairgrounds, Indianapolis, IN', state: 'IN', type: 'show',
    description: 'Concours judging for muscle cars, Corvettes, and Pontiacs from 1960–1972. One of the most respected judged shows in the Midwest.',
  },
  {
    id: 'mopars-nationals-2026', name: 'Mopar Nationals', date: '2026-08-14', endDate: '2026-08-16',
    location: 'National Trail Raceway, Hebron, OH', state: 'OH', type: 'show',
    description: 'The premier Mopar event in the country. Drag racing, a car corral, swap meet, and thousands of Chrysler, Dodge, and Plymouth vehicles on display.',
  },
  {
    id: 'midwest-dream-car-collection', name: 'Mecum Kansas City Spring Auction', date: '2026-04-23', endDate: '2026-04-25',
    location: 'Kansas City Convention Center, Kansas City, MO', state: 'MO', type: 'auction',
    description: 'Mecum\'s spring Kansas City auction typically features 1,000+ collector vehicles from muscle cars to exotics.',
  },
];

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

      {/* Featured events */}
      <section className="mb-14">
        <h2 className="text-lg font-bold text-zinc-900 mb-5">Major Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {featured.map(event => (
            <div key={event.id} className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-600 rounded-l-2xl" />
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TYPE_COLORS[event.type]}`}>
                  {TYPE_LABELS[event.type]}
                </span>
                <span className="text-xs text-zinc-400">{event.state}</span>
              </div>
              <h3 className="text-base font-bold text-zinc-900 mb-1">{event.name}</h3>
              <p className="text-sm font-semibold text-red-600 mb-1">{formatEventDate(event.date, event.endDate)}</p>
              <p className="text-xs text-zinc-500 mb-3">{event.location}</p>
              <p className="text-sm text-zinc-600 leading-relaxed">{event.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full calendar */}
      <section>
        <h2 className="text-lg font-bold text-zinc-900 mb-5">All 2026 Events</h2>
        <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
          {all.map((event, i) => {
            const isPast = event.date < new Date().toISOString().slice(0, 10);
            return (
              <div
                key={event.id}
                className={`flex items-start gap-5 px-6 py-5 ${i < all.length - 1 ? 'border-b border-zinc-50' : ''} ${isPast ? 'opacity-50' : ''}`}
              >
                {/* Date column */}
                <div className="flex-shrink-0 w-14 text-center">
                  <p className="text-xs font-semibold text-zinc-400 uppercase leading-none mb-0.5">
                    {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                  <p className="text-2xl font-extrabold text-zinc-900 leading-none">
                    {new Date(event.date + 'T12:00:00').getDate()}
                  </p>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[event.type]}`}>
                      {TYPE_LABELS[event.type]}
                    </span>
                    <span className="text-xs text-zinc-400">{event.state}</span>
                    {isPast && <span className="text-xs text-zinc-400 italic">past</span>}
                  </div>
                  <h3 className="font-bold text-zinc-900 text-sm">{event.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{event.location}</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">{event.description}</p>
                </div>

                {/* End date */}
                {event.endDate && (
                  <div className="flex-shrink-0 text-right hidden sm:block">
                    <p className="text-xs text-zinc-400">thru</p>
                    <p className="text-xs font-semibold text-zinc-600">
                      {new Date(event.endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

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
