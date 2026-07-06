import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

const CATEGORY_LABELS: Record<string, string> = {
  detail: 'Auto Detailing',
  insurance: 'Classic Car Insurance',
  finance: 'Financing',
  transport: 'Transport & Shipping',
  storage: 'Storage',
  restoration: 'Restoration',
  inspection: 'Pre-Purchase Inspection',
  other: 'Local Service',
};

const TIER_LABELS: Record<string, string> = {
  starter: 'Local',
  metro: 'Metro',
  regional: 'Regional',
  statewide: 'Statewide',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('advertisers').select('business_name, city, state, category, description').eq('slug', slug).single();
  if (!data) return {};
  const title = `${data.business_name} — ${CATEGORY_LABELS[data.category] ?? 'Classic Car Service'}`;
  const desc = data.description
    ? data.description.slice(0, 160)
    : `${data.business_name} is a trusted ${CATEGORY_LABELS[data.category] ?? 'classic car service'}${data.city ? ` in ${data.city}` : ''}${data.state ? `, ${data.state}` : ''} on GarageCherries.`;
  return {
    title,
    description: desc,
    alternates: { canonical: `https://www.garagecherries.com/advertisers/${slug}` },
    openGraph: { title, description: desc, url: `https://www.garagecherries.com/advertisers/${slug}` },
  };
}

export default async function AdvertiserProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('id, slug, business_name, contact_name, phone, address, city, state, zip, category, tier, description, website, active, trial_ends_at')
    .eq('slug', slug)
    .single();

  if (!advertiser || !advertiser.active || new Date(advertiser.trial_ends_at) < new Date()) notFound();

  // Fetch their active ads to display
  const { data: ads } = await supabase
    .from('ads')
    .select('id, headline, body_copy, cta_label, cta_url, phone, logo_url, photo_url')
    .eq('advertiser_id', advertiser.id)
    .eq('active', true)
    .limit(3);

  const category = CATEGORY_LABELS[advertiser.category] ?? 'Classic Car Service';
  const location = [advertiser.city, advertiser.state].filter(Boolean).join(', ');

  const localBusinessJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: advertiser.business_name,
    description: advertiser.description ?? `${advertiser.business_name} — ${category} serving classic car enthusiasts.`,
    url: advertiser.website ?? `https://www.garagecherries.com/advertisers/${advertiser.slug}`,
    ...(advertiser.phone ? { telephone: advertiser.phone } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(advertiser.address ? { streetAddress: advertiser.address } : {}),
      ...(advertiser.city ? { addressLocality: advertiser.city } : {}),
      ...(advertiser.state ? { addressRegion: advertiser.state } : {}),
      ...(advertiser.zip ? { postalCode: advertiser.zip } : {}),
      addressCountry: 'US',
    },
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.garagecherries.com' },
      { '@type': 'ListItem', position: 2, name: 'Advertisers', item: 'https://www.garagecherries.com/advertisers' },
      { '@type': 'ListItem', position: 3, name: advertiser.business_name, item: `https://www.garagecherries.com/advertisers/${advertiser.slug}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <nav className="text-sm text-zinc-400 mb-6">
        <Link href="/advertisers" className="hover:text-red-600">Advertisers</Link>
        <span className="mx-2">›</span>
        <span className="text-zinc-700">{advertiser.business_name}</span>
      </nav>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              {category}
            </span>
            <h1 className="text-3xl font-extrabold text-zinc-900 mb-1">{advertiser.business_name}</h1>
            {location && <p className="text-zinc-500 text-sm mb-1">📍 {location}{advertiser.zip ? ` ${advertiser.zip}` : ''}</p>}
            {advertiser.tier && (
              <span className="inline-block text-xs text-zinc-400 border border-zinc-200 rounded-full px-2.5 py-0.5">
                {TIER_LABELS[advertiser.tier] ?? advertiser.tier} coverage
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 min-w-[140px]">
            {advertiser.phone && (
              <a href={`tel:${advertiser.phone}`}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                📞 Call Now
              </a>
            )}
            {advertiser.website && (
              <a href={advertiser.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 border border-zinc-200 hover:border-red-300 text-zinc-700 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                🌐 Website
              </a>
            )}
          </div>
        </div>

        {advertiser.description && (
          <p className="text-zinc-600 mt-6 leading-relaxed">{advertiser.description}</p>
        )}

        {advertiser.address && (
          <div className="mt-6 pt-6 border-t border-zinc-100">
            <p className="text-sm text-zinc-500">
              <span className="font-semibold text-zinc-700">Address: </span>
              {[advertiser.address, advertiser.city, advertiser.state, advertiser.zip].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
      </div>

      {/* Active ads */}
      {ads && ads.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold text-zinc-900 mb-4">Current Offers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ads.map(ad => (
              <div key={ad.id} className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
                {ad.headline && <p className="font-bold text-zinc-900 mb-2">{ad.headline}</p>}
                {ad.body_copy && <p className="text-zinc-500 text-sm mb-4">{ad.body_copy}</p>}
                {ad.cta_url && (
                  <a href={ad.cta_url} target="_blank" rel="noopener noreferrer"
                    className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-xl text-sm transition-colors">
                    {ad.cta_label || 'Learn More'}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Back link */}
      <Link href="/advertisers" className="text-sm text-zinc-400 hover:text-red-600">
        ← Back to all advertisers
      </Link>
    </div>
    </>
  );
}
