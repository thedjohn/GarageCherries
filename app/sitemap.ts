import { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchAllRows } from '@/lib/db';
import { toSegment } from '@/lib/data';
import { MAKES } from '@/lib/types';
import { ENCYCLOPEDIA, getMakeSlugs } from '@/lib/encyclopedia';
import { getBodyStyleSlugs } from '@/lib/bodyStyles';
import { getDecadeSlugs } from '@/lib/decades';
import { getPriceTierSlugs } from '@/lib/priceTiers';
import { stateSlug } from '@/lib/usStates';

function encyclopediaSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Was 300 (5-minute ISR cache), but Vercel's edge was observed serving a
// stale response well past that window (x-vercel-cache: HIT, age > 1200s)
// without triggering a background regeneration -- newly-approved events were
// missing from the live sitemap for 20+ minutes. Always-fresh matches the
// same tradeoff app/events/[slug]/page.tsx already makes (revalidate = 0)
// for the same reason: this data needs to be correct more than it needs to
// be cached, and sitemap.xml's low request volume makes that cheap.
export const revalidate = 0;

const BASE_URL = 'https://www.garagecherries.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  interface SitemapCarRow {
    id: string; slug: string; make: string; model: string;
    featured: boolean | null; listed_at: string | null; created_at: string | null;
  }

  interface SitemapEventRow {
    id: string; slug: string; date: string | null; state: string | null;
  }

  // Paged past Supabase's default 1000-row cap on an uncapped select -- with
  // 1086 approved listings as of this fix, the old raw .select() silently
  // dropped every listing past the first 1000 from the sitemap (confirmed
  // live via the sitemap-health cron's alert). Ordered by id, the one column
  // guaranteed unique enough for safe, gap-free paging (this list doesn't
  // care about row order). Events hit the same cap once approved events
  // passed 1000 (a state-by-state events import pushed the total past 13,000),
  // silently dropping most event pages from the sitemap -- same fix applies.
  const [cars, { data: dealers }, { data: advertisers }, events] = await Promise.all([
    fetchAllRows<SitemapCarRow>((from, to) => supabase
      .from('listings')
      .select('id, slug, make, model, featured, listed_at, created_at')
      .eq('status', 'approved')
      .order('id', { ascending: true })
      .range(from, to)),
    supabase.from('dealers').select('slug, created_at'),
    supabase.from('advertisers').select('slug, created_at').eq('active', true).gt('trial_ends_at', new Date().toISOString()),
    fetchAllRows<SitemapEventRow>((from, to) => supabase
      .from('events')
      .select('id, slug, date, state')
      .eq('status', 'approved')
      .not('slug', 'is', null)
      .order('id', { ascending: true })
      .range(from, to)),
  ]);

  const GUIDE_SLUGS = [
    'how-to-buy-a-classic-car-online',
    'pre-purchase-inspection-checklist',
    'questions-to-ask-a-classic-car-dealer',
    'classic-car-red-flags',
    'how-to-negotiate-classic-car-price',
    'classic-car-shipping-guide',
    'classic-car-financing',
    'auction-vs-private-sale',
    'how-to-value-a-muscle-car',
    'classic-car-insurance-guide',
  ];

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/listings`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/dealers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/sell`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/advertise`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/guides`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/reports`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/sold`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/feedback`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/advertisers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/events`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/dealer/apply`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/advertiser/signup`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  // A blank make/model (bad import data) would otherwise produce a broken
  // double-slash URL -- confirmed live via the sitemap-health cron catching
  // a listing whose empty model field 404'd.
  const listingPages: MetadataRoute.Sitemap = (cars ?? [])
    .filter(car => car.make && car.model)
    .map(car => ({
      url: `${BASE_URL}/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`,
      lastModified: new Date(car.created_at ?? car.listed_at ?? new Date()),
      changeFrequency: 'weekly' as const,
      priority: car.featured ? 0.9 : 0.8,
    }));

  // Only advertise a make-browse page for makes the site actually recognizes --
  // /listings/[make] resolves the URL segment against MAKES (see makeFromSegment
  // in lib/data.ts), not against whatever raw make strings happen to be sitting
  // in the listings table. A listing with an unrecognized make (e.g. a dealer
  // feed sending "Mercedes-Benz" when the site's list has "Mercedes") would
  // otherwise get a sitemap entry that 404s -- confirmed live via a broken
  // /listings/mercedes-benz URL caught by the sitemap-health cron.
  const knownMakeSegments = new Set(MAKES.map(m => toSegment(m)));
  const makes = [...new Set((cars ?? []).map(c => c.make))].filter(make => knownMakeSegments.has(toSegment(make)));
  const makePages: MetadataRoute.Sitemap = makes.map(make => ({
    url: `${BASE_URL}/listings/${toSegment(make)}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const dealerPages: MetadataRoute.Sitemap = (dealers ?? []).map(d => ({
    url: `${BASE_URL}/dealers/${d.slug}`,
    lastModified: new Date(d.created_at ?? new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Classic Car Encyclopedia — /cars index + make pages + model pages
  const encyclopediaIndex: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/cars`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE_URL}/cars/muscle-cars`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/cars/srt`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  const encyclopediaMakePages: MetadataRoute.Sitemap = getMakeSlugs().map(makeSlug => ({
    url: `${BASE_URL}/cars/${makeSlug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const bodyStylePages: MetadataRoute.Sitemap = getBodyStyleSlugs().map(slug => ({
    url: `${BASE_URL}/cars/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const decadePages: MetadataRoute.Sitemap = getDecadeSlugs().map(slug => ({
    url: `${BASE_URL}/cars/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const priceTierPages: MetadataRoute.Sitemap = getPriceTierSlugs().map(slug => ({
    url: `${BASE_URL}/cars/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const encyclopediaModelPages: MetadataRoute.Sitemap = ENCYCLOPEDIA.map(entry => ({
    url: `${BASE_URL}/cars/${encyclopediaSlug(entry.make)}/${encyclopediaSlug(entry.model)}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  const advertiserPages: MetadataRoute.Sitemap = (advertisers ?? [])
    .filter(a => a.slug)
    .map(a => ({
      url: `${BASE_URL}/advertisers/${a.slug}`,
      lastModified: new Date(a.created_at ?? new Date()),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

  const guidePages: MetadataRoute.Sitemap = GUIDE_SLUGS.map(slug => ({
    url: `${BASE_URL}/guides/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  const eventPages: MetadataRoute.Sitemap = (events ?? [])
    .filter(e => e.slug)
    .map(e => ({
      url: `${BASE_URL}/events/${e.slug}`,
      lastModified: new Date(e.date ?? new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

  // One real page per state with at least one real event -- see app/events/state/[state]/page.tsx.
  const eventStates = [...new Set((events ?? []).map(e => e.state).filter((s): s is string => Boolean(s)))];
  const eventStatePages: MetadataRoute.Sitemap = eventStates.map(state => ({
    url: `${BASE_URL}/events/state/${stateSlug(state)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.65,
  }));

  // Make + model combo pages derived from live listings (e.g. /listings/ford/mustang).
  // Combos with 2 or fewer listings are set to noindex on the page itself (see
  // generateMetadata in app/listings/[...segments]/page.tsx) -- excluded here too
  // so the sitemap doesn't advertise pages we're telling Google not to index.
  const comboCounts = new Map<string, number>();
  (cars ?? []).forEach(c => {
    const combo = `${toSegment(c.make)}/${toSegment(c.model)}`;
    comboCounts.set(combo, (comboCounts.get(combo) ?? 0) + 1);
  });
  const makeModelCombos = [...comboCounts.entries()].filter(([, count]) => count > 2).map(([combo]) => combo);
  const makeModelPages: MetadataRoute.Sitemap = makeModelCombos.map(combo => ({
    url: `${BASE_URL}/listings/${combo}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...listingPages,
    ...makePages,
    ...makeModelPages,
    ...dealerPages,
    ...encyclopediaIndex,
    ...encyclopediaMakePages,
    ...bodyStylePages,
    ...decadePages,
    ...priceTierPages,
    ...encyclopediaModelPages,
    ...advertiserPages,
    ...guidePages,
    ...eventPages,
    ...eventStatePages,
  ];
}
