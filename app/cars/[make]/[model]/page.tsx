import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import CarCard from '@/components/CarCard';
import { getEntry, ENCYCLOPEDIA } from '@/lib/encyclopedia';
import { fetchCars } from '@/lib/db';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface Props {
  params: Promise<{ make: string; model: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug, model: modelSlug } = await params;
  const entry = getEntry(makeSlug, modelSlug);
  if (!entry) return { title: 'Not Found' };
  return {
    title: `${entry.make} ${entry.model} (${entry.years}) — Specs, History & Buyer's Guide | GarageCherries`,
    description: entry.overview,
    alternates: { canonical: `https://www.garagecherries.com/cars/${makeSlug}/${modelSlug}` },
    openGraph: {
      title: `${entry.make} ${entry.model} Buyer's Guide`,
      description: entry.overview,
      type: 'article',
    },
  };
}

export async function generateStaticParams() {
  return ENCYCLOPEDIA.map(entry => ({
    make: slugify(entry.make),
    model: slugify(entry.model),
  }));
}

export default async function ModelPage({ params }: Props) {
  const { make: makeSlug, model: modelSlug } = await params;
  const entry = getEntry(makeSlug, modelSlug);
  if (!entry) notFound();

  const listings = await fetchCars({ make: entry.make, model: entry.model, limit: 6 });

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${entry.make} ${entry.model} (${entry.years}) — Specs, History & Buyer's Guide`,
    description: entry.overview,
    url: `https://www.garagecherries.com/cars/${makeSlug}/${modelSlug}`,
    publisher: {
      '@type': 'Organization',
      name: 'GarageCherries',
      url: 'https://www.garagecherries.com',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.garagecherries.com' },
      { '@type': 'ListItem', position: 2, name: 'Encyclopedia', item: 'https://www.garagecherries.com/cars' },
      { '@type': 'ListItem', position: 3, name: `${entry.make} Classic Cars`, item: `https://www.garagecherries.com/cars/${makeSlug}` },
      { '@type': 'ListItem', position: 4, name: `${entry.make} ${entry.model}`, item: `https://www.garagecherries.com/cars/${makeSlug}/${modelSlug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8 flex-wrap">
        <Link href="/cars" className="hover:text-red-600 transition-colors">Encyclopedia</Link>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/cars/${makeSlug}`} className="hover:text-red-600 transition-colors">{entry.make}</Link>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-zinc-700">{entry.model}</span>
      </nav>

      {/* Hero */}
      <div className="mb-10 pb-10 border-b border-zinc-100">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs font-semibold bg-red-100 text-red-700 px-3 py-1 rounded-full">{entry.years}</span>
          <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Collector's Guide</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-2">
          {entry.make} {entry.model}
        </h1>
        <p className="text-xl text-red-600 font-semibold mb-4">{entry.tagline}</p>
        <p className="text-lg text-zinc-600 max-w-3xl leading-relaxed">{entry.overview}</p>
      </div>

      {/* Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-16">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-12">
          {/* History */}
          <section>
            <h2 className="text-2xl font-bold text-zinc-900 mb-5">History</h2>
            <div className="space-y-4">
              {entry.history.map((para, i) => (
                <p key={i} className="text-zinc-600 leading-relaxed">{para}</p>
              ))}
            </div>
          </section>

          {/* Notable Versions */}
          <section>
            <h2 className="text-2xl font-bold text-zinc-900 mb-5">Notable Versions</h2>
            <div className="space-y-3">
              {entry.notableVersions.map((v, i) => (
                <div key={i} className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                  <p className="font-bold text-zinc-900 text-sm mb-1">{v.name}</p>
                  <p className="text-sm text-zinc-600">{v.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Buying Tips */}
          <section>
            <h2 className="text-2xl font-bold text-zinc-900 mb-1">What to Look for When Buying</h2>
            <p className="text-zinc-500 text-sm mb-6">Key inspection points from experienced collectors.</p>
            <div className="space-y-5">
              {entry.buyingTips.map((tip, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-zinc-900 text-sm">{tip.title}</p>
                    <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{tip.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-5 lg:sticky lg:top-24 self-start">
          {/* Quick Specs */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-4 text-sm uppercase tracking-wide">Quick Specs</h3>
            <dl className="space-y-3">
              {entry.specs.map((spec, i) => (
                <div key={i} className={`text-sm ${i < entry.specs.length - 1 ? 'pb-3 border-b border-zinc-50' : ''}`}>
                  <dt className="text-zinc-400 text-xs mb-0.5">{spec.label}</dt>
                  <dd className="font-semibold text-zinc-800">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Price Guide */}
          <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-zinc-900 mb-1 text-sm uppercase tracking-wide">Market Price Guide</h3>
            <p className="text-xs text-zinc-400 mb-4">Approximate US asking prices</p>
            <div className="space-y-3">
              {[
                { label: 'Project', range: entry.priceRange.project, color: 'bg-yellow-100 text-yellow-800' },
                { label: 'Driver', range: entry.priceRange.driver, color: 'bg-blue-100 text-blue-800' },
                { label: 'Show', range: entry.priceRange.show, color: 'bg-green-100 text-green-800' },
              ].map(tier => (
                <div key={tier.label} className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${tier.color}`}>{tier.label}</span>
                  <span className="text-sm font-semibold text-zinc-800 text-right">{tier.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shop CTA */}
          <div className="bg-red-600 rounded-2xl p-5 text-white">
            <p className="font-bold mb-1">Ready to find one?</p>
            <p className="text-sm text-red-100 mb-4">
              Browse current {entry.make} {entry.model} listings from trusted dealers.
            </p>
            <Link
              href={`/listings?make=${encodeURIComponent(entry.make)}&model=${encodeURIComponent(entry.model)}`}
              className="block w-full bg-white text-red-600 font-bold text-sm text-center py-2.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              View All Listings →
            </Link>
          </div>
        </div>
      </div>

      {/* Live Inventory */}
      <section className="border-t border-zinc-100 pt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              {entry.make} {entry.model} For Sale
            </h2>
            <p className="text-zinc-500 text-sm mt-1">
              {listings.length > 0
                ? `${listings.length} listing${listings.length !== 1 ? 's' : ''} currently available`
                : 'No listings currently available — check back soon'}
            </p>
          </div>
          {listings.length > 0 && (
            <Link
              href={`/listings?make=${encodeURIComponent(entry.make)}&model=${encodeURIComponent(entry.model)}`}
              className="text-sm font-semibold text-red-600 hover:underline whitespace-nowrap"
            >
              View all →
            </Link>
          )}
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map(car => <CarCard key={car.id} car={car} />)}
          </div>
        ) : (
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <h3 className="text-lg font-bold text-zinc-800 mb-2">No listings right now</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Set up an alert and we'll email you when a {entry.make} {entry.model} is listed.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href={`/listings?make=${encodeURIComponent(entry.make)}&model=${encodeURIComponent(entry.model)}`}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Browse All {entry.make} Listings
              </Link>
              <Link
                href={`/account/login`}
                className="border border-zinc-200 hover:border-red-300 text-zinc-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Set Up Alert
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
    </>
  );
}
