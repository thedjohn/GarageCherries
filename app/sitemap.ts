import { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { toSegment } from '@/lib/data';
import { ENCYCLOPEDIA, getMakeSlugs } from '@/lib/encyclopedia';

function encyclopediaSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const revalidate = 300;

const BASE_URL = 'https://www.garagecherries.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();

  const [{ data: cars }, { data: dealers }, { data: advertisers }, { data: events }] = await Promise.all([
    supabase.from('listings').select('id, slug, make, model, featured, listed_at, created_at').eq('status', 'approved'),
    supabase.from('dealers').select('slug, created_at'),
    supabase.from('advertisers').select('slug, created_at').eq('active', true).gt('trial_ends_at', new Date().toISOString()),
    supabase.from('events').select('slug, date').eq('status', 'approved').not('slug', 'is', null),
  ]);

  const GUIDE_SLUGS = [
    'how-to-buy-a-classic-car-online',
    'pre-purchase-inspection-checklist',
    'questions-to-ask-a-classic-car-dealer',
    'classic-car-red-flags',
    'how-to-negotiate-classic-car-price',
    'classic-car-shipping-guide',
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

  const listingPages: MetadataRoute.Sitemap = (cars ?? []).map(car => ({
    url: `${BASE_URL}/listings/${toSegment(car.make)}/${toSegment(car.model)}/${car.id}/${car.slug}`,
    lastModified: new Date(car.created_at ?? car.listed_at ?? new Date()),
    changeFrequency: 'weekly' as const,
    priority: car.featured ? 0.9 : 0.8,
  }));

  const makes = [...new Set((cars ?? []).map(c => c.make))];
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
    { url: `${BASE_URL}/cars/srt`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  const encyclopediaMakePages: MetadataRoute.Sitemap = getMakeSlugs().map(makeSlug => ({
    url: `${BASE_URL}/cars/${makeSlug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
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

  // Make + model combo pages derived from live listings (e.g. /listings/ford/mustang)
  const makeModelCombos = [...new Set((cars ?? []).map(c => `${toSegment(c.make)}/${toSegment(c.model)}`))];
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
    ...encyclopediaModelPages,
    ...advertiserPages,
    ...guidePages,
    ...eventPages,
  ];
}
