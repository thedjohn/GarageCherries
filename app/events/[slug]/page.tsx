import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';

export const revalidate = 0;

interface Event {
  id: string; name: string; slug: string; date: string; end_date?: string | null;
  start_time?: string | null; end_time?: string | null;
  location: string; state: string; type: string;
  featured: boolean; description: string; url?: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  'show': 'Car Show', 'swap-meet': 'Swap Meet', 'cruise': 'Cruise Night', 'auction': 'Auction',
};

function formatDate(date: string, endDate?: string | null) {
  const start = new Date(date + 'T12:00:00');
  const opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  if (!endDate) return start.toLocaleDateString('en-US', opts);
  const end = new Date(endDate + 'T12:00:00');
  const shortOpts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', shortOpts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function gcalUrl(event: Event) {
  const dateStr = event.date.replace(/-/g, '');
  const startDt = event.start_time
    ? `${dateStr}T${event.start_time.replace(':', '')}00`
    : dateStr;
  const endDt = event.end_time
    ? `${dateStr}T${event.end_time.replace(':', '')}00`
    : event.end_date
    ? event.end_date.replace(/-/g, '')
    : dateStr;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${startDt}/${endDt}`,
    details: event.description,
    location: `${event.location}, ${event.state}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data } = await admin.from('events').select('name, description, date, location, state').eq('slug', slug).eq('status', 'approved').single();
  if (!data) return { title: 'Event Not Found' };
  const dateStr = new Date(data.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return {
    title: `${data.name} — ${dateStr}`,
    description: `${data.name} on ${dateStr} in ${data.location}, ${data.state}. ${data.description?.slice(0, 120)}`,
    alternates: { canonical: `https://www.garagecherries.com/events/${slug}` },
    openGraph: {
      title: `${data.name} — ${dateStr}`,
      description: data.description?.slice(0, 200),
      type: 'website',
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: event } = await admin
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'approved')
    .single();

  if (!event) notFound();

  const e = event as Event;
  const timeRange = e.start_time
    ? e.end_time
      ? `${formatTime(e.start_time)} – ${formatTime(e.end_time)}`
      : formatTime(e.start_time)
    : null;

  // TODO after 2026-07-31: replace promo eagle image with permanent brand OG image (cherry logo + tagline, no promo text)
  // JSON-LD Event schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.name,
    description: e.description,
    startDate: e.start_time ? `${e.date}T${e.start_time}:00` : e.date,
    endDate: e.end_time ? `${e.date}T${e.end_time}:00` : e.end_date ?? e.date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: e.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: e.location,
        addressRegion: e.state,
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'GarageCherries',
      url: 'https://www.garagecherries.com',
    },
    image: 'https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/promo/gc%20eagle.png',
    offers: {
      '@type': 'Offer',
      url: e.url ?? `https://www.garagecherries.com/events/${e.slug}`,
      availability: 'https://schema.org/InStock',
      price: '0',
      priceCurrency: 'USD',
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted' },
    },
    ...(e.url ? { url: e.url } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-3xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <Link href="/events" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-600 transition-colors mb-8">
          ← Car Show Calendar
        </Link>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
            e.type === 'show' ? 'bg-blue-100 text-blue-700' :
            e.type === 'swap-meet' ? 'bg-amber-100 text-amber-700' :
            e.type === 'cruise' ? 'bg-green-100 text-green-700' :
            'bg-purple-100 text-purple-700'
          }`}>{TYPE_LABELS[e.type] ?? e.type}</span>
          {e.featured && <span className="text-xs font-bold uppercase px-2.5 py-1 rounded-full bg-red-100 text-red-600">Featured</span>}
        </div>

        <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 mb-6 leading-tight">{e.name}</h1>

        {/* Details */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-6 mb-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">📅</span>
            <div>
              <p className="font-semibold text-zinc-900">{formatDate(e.date, e.end_date)}</p>
              {timeRange && <p className="text-sm text-zinc-500 mt-0.5">{timeRange}</p>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">📍</span>
            <p className="font-semibold text-zinc-900">{e.location}, {e.state}</p>
          </div>
          {e.url && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">🌐</span>
              <a href={e.url} target="_blank" rel="noopener noreferrer"
                className="font-semibold text-red-600 hover:underline break-all">
                {e.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </div>
          )}
        </div>

        {/* Description */}
        {e.description && (
          <div className="bg-zinc-50 rounded-2xl p-6 mb-6">
            <p className="text-zinc-700 leading-relaxed">{e.description}</p>
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-3 flex-wrap">
          <a href={gcalUrl(e)} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors">
            + Add to Google Calendar
          </a>
          {e.url && (
            <a href={e.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-zinc-200 hover:border-red-300 text-zinc-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors">
              Visit Event Website →
            </a>
          )}
        </div>

        <p className="mt-10 text-xs text-zinc-400">
          Dates are subject to change. Verify with organizers before making travel arrangements.
          GarageCherries is not affiliated with this event.
        </p>
      </div>
    </>
  );
}
