import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import CarCard from '@/components/CarCard';
import { fetchDealer, fetchCars } from '@/lib/db';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dealer = await fetchDealer(slug);
  if (!dealer) return {};
  const title = `${dealer.name} — Classic Car Dealer`;
  const desc = dealer.description
    ? dealer.description.slice(0, 160)
    : `Browse classic cars for sale from ${dealer.name}${dealer.location ? ` in ${dealer.location}` : ''}${dealer.state ? `, ${dealer.state}` : ''}. View inventory and contact the dealer on GarageCherries.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `https://www.garagecherries.com/dealers/${slug}` },
    openGraph: { title, description: desc, url: `https://www.garagecherries.com/dealers/${slug}` },
  };
}

export default async function DealerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const dealer = await fetchDealer(slug);
  if (!dealer) notFound();

  const listings = await fetchCars({ sellerId: dealer.id });

  const paragraphs = (dealer.description ?? '').split('\n\n').filter(Boolean);
  const specialties: string[] = dealer.specialties ?? [];

  const addressParts = [(dealer as any).address, dealer.location, dealer.state, (dealer as any).zip].filter(Boolean);
  const DAYS = [
    { key: 'mon', label: 'Monday' }, { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' }, { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' }, { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ] as const;
  const hours = (dealer as any).hours as Record<string, { open: string; close: string; closed: boolean }> | null;
  const mapQuery = encodeURIComponent(addressParts.length > 0 ? addressParts.join(', ') : dealer.name);
  const mapSrc = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    name: dealer.name,
    description: dealer.description ?? '',
    url: `https://www.garagecherries.com/dealers/${dealer.slug}`,
    ...(dealer.phone ? { telephone: dealer.phone } : {}),
    ...(dealer.website ? { sameAs: dealer.website } : {}),
    ...(dealer.since ? { foundingDate: String(dealer.since) } : {}),
    address: {
      '@type': 'PostalAddress',
      ...((dealer as any).address ? { streetAddress: (dealer as any).address } : {}),
      ...(dealer.location ? { addressLocality: dealer.location } : {}),
      ...(dealer.state ? { addressRegion: dealer.state } : {}),
      ...((dealer as any).zip ? { postalCode: (dealer as any).zip } : {}),
      addressCountry: 'US',
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <nav className="text-sm text-zinc-500 mb-6 flex gap-2">
          <Link href="/" className="hover:text-red-600">Home</Link>
          <span>/</span>
          <Link href="/dealers" className="hover:text-red-600">Dealers</Link>
          <span>/</span>
          <span className="text-zinc-800">{dealer.name}</span>
        </nav>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-20 h-20 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-center shrink-0 overflow-hidden p-1">
              {dealer.logo ? (
                <Image src={dealer.logo} alt={`${dealer.name} logo`} width={72} height={72} className="object-contain w-full h-full" />
              ) : (
                <span className="text-4xl">🏎️</span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900">{dealer.name}</h1>
                  <div className="flex items-center gap-2 text-zinc-500 text-sm mt-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {dealer.location}{dealer.state ? `, ${dealer.state}` : ''}{dealer.since ? ` · Est. ${dealer.since}` : ''}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:items-end">
                  {dealer.phone && (
                    <a href={`tel:${dealer.phone.replace(/\D/g, '')}`}
                      className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                      </svg>
                      {dealer.phone}
                    </a>
                  )}
                  {dealer.email && (
                    <a href={`mailto:${dealer.email}`} className="text-sm text-red-600 hover:underline text-center sm:text-right">
                      {dealer.email}
                    </a>
                  )}
                  {dealer.website && (
                    <a href={dealer.website} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-red-600 hover:underline text-center sm:text-right flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {dealer.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-3 mt-4">
                {paragraphs.map((para: string, i: number) => (
                  <p key={i} className="text-zinc-600 leading-relaxed">{para}</p>
                ))}
              </div>

              {specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {specialties.map(s => (
                    <span key={s} className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Map */}
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-semibold text-zinc-600">{addressParts.join(', ')}</span>
            </div>
            <iframe src={mapSrc} className="w-full h-56" style={{ border: 0 }}
              allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              title={`Map of ${dealer.name}`} />
          </div>

          {/* Business Hours */}
          {hours && (
            <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
              <h3 className="text-sm font-bold text-zinc-700 mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Business Hours
              </h3>
              <div className="space-y-2">
                {DAYS.map(({ key, label }) => {
                  const day = hours[key];
                  if (!day) return null;
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-zinc-600 font-medium">{label}</span>
                      {day.closed
                        ? <span className="text-zinc-400">Closed</span>
                        : <span className="text-zinc-800">{day.open} – {day.close}</span>
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-zinc-900">
            Current Inventory
            <span className="ml-2 text-lg font-normal text-zinc-400">({listings.length})</span>
          </h2>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <h3 className="text-xl font-bold text-zinc-800 mb-2">No active listings</h3>
            <p className="text-zinc-500">Check back soon — this dealer updates inventory regularly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map(car => <CarCard key={car.id} car={car} />)}
          </div>
        )}
      </div>
    </>
  );
}
