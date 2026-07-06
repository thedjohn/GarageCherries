import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getEntriesByMake, getMakeLabel, getMakeSlugs } from '@/lib/encyclopedia';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface Props {
  params: Promise<{ make: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { make: makeSlug } = await params;
  const makeLabel = getMakeLabel(makeSlug);
  if (!makeLabel) return { title: 'Not Found' };
  return {
    title: `${makeLabel} Classic Cars — Encyclopedia & Buyer's Guides | GarageCherries`,
    description: `Research ${makeLabel} classic cars. Specs, history, buying tips, and market values for every collectible ${makeLabel} model.`,
    alternates: { canonical: `https://www.garagecherries.com/cars/${makeSlug}` },
  };
}

export async function generateStaticParams() {
  return getMakeSlugs().map(make => ({ make }));
}

export default async function MakePage({ params }: Props) {
  const { make: makeSlug } = await params;
  const entries = getEntriesByMake(makeSlug);
  if (!entries.length) notFound();

  const makeLabel = entries[0].make;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.garagecherries.com' },
      { '@type': 'ListItem', position: 2, name: 'Encyclopedia', item: 'https://www.garagecherries.com/cars' },
      { '@type': 'ListItem', position: 3, name: `${makeLabel} Classic Cars`, item: `https://www.garagecherries.com/cars/${makeSlug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-zinc-400 mb-8">
        <Link href="/cars" className="hover:text-red-600 transition-colors">Encyclopedia</Link>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-zinc-700">{makeLabel}</span>
      </nav>

      <h1 className="text-3xl font-extrabold text-zinc-900 mb-2">{makeLabel} Classic Cars</h1>
      <p className="text-zinc-500 mb-10">Specs, history, and buyer's guides for every collectible {makeLabel}.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {entries.map(entry => {
          const modelSlug = slugify(entry.model);
          return (
            <Link
              key={modelSlug}
              href={`/cars/${makeSlug}/${modelSlug}`}
              className="bg-white border border-zinc-100 rounded-2xl p-6 hover:border-red-200 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-zinc-900 group-hover:text-red-600 transition-colors">
                      {makeLabel} {entry.model}
                    </h2>
                    <span className="text-xs text-zinc-400">{entry.years}</span>
                  </div>
                  <p className="text-sm font-semibold text-red-600 mt-0.5">{entry.tagline}</p>
                  <p className="text-sm text-zinc-500 mt-2 line-clamp-2">{entry.overview}</p>
                  <div className="flex items-center gap-3 mt-4 text-xs text-zinc-400">
                    <span>{entry.specs.length} specs</span>
                    <span>·</span>
                    <span>{entry.buyingTips.length} buying tips</span>
                    <span>·</span>
                    <span>Price guide</span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-zinc-300 group-hover:text-red-400 flex-shrink-0 transition-colors mt-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 pt-8 border-t border-zinc-100">
        <Link href="/cars" className="text-sm text-zinc-400 hover:text-red-600 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          All Makes
        </Link>
      </div>
    </div>
    </>
  );
}
