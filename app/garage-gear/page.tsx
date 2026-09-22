import { createAdminClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/data';
import AffiliateDisclosure from '@/components/AffiliateDisclosure';
import TrackedLink from '@/components/TrackedLink';

export const revalidate = 0;

export const metadata = {
  title: 'Garage Gear',
  description: 'Tools and products for classic, muscle, and collector car owners — inspection gear, detailing supplies, and more.',
  alternates: { canonical: 'https://www.garagecherries.com/garage-gear' },
};

interface AffiliateProduct {
  id: string; name: string; image_url: string | null; description: string;
  category: string; merchant: string; affiliate_url: string; price: number | null; featured: boolean;
}

export default async function GarageGearPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('affiliate_products')
    .select('id, name, image_url, description, category, merchant, affiliate_url, price, featured')
    .eq('active', true)
    .order('category', { ascending: true })
    .order('display_order', { ascending: true });

  const products = (data ?? []) as AffiliateProduct[];
  const byCategory = products.reduce<Record<string, AffiliateProduct[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Garage Gear</h1>
        <p className="text-lg text-zinc-500 max-w-2xl">
          Tools and products we recommend for classic, muscle, collector, and enthusiast car owners.
        </p>
      </div>

      {products.length === 0 && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-16 text-center shadow-sm">
          <p className="text-4xl mb-4">🧰</p>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">Nothing here yet</h2>
          <p className="text-zinc-500 text-sm">Check back soon for gear recommendations.</p>
        </div>
      )}

      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category} className="mb-10">
          <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">{category}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(p => (
              <TrackedLink
                key={p.id}
                href={p.affiliate_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className={`block bg-white border rounded-2xl p-5 shadow-sm hover:border-red-200 transition-colors ${p.featured ? 'border-red-200' : 'border-zinc-100'}`}
                eventName="affiliate_click"
                eventParams={{ label: p.name, category: p.category, source: 'garage_gear_page' }}
              >
                {p.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element -- external merchant image hosts, not worth registering every one in next.config
                  <img src={p.image_url} alt={p.name} className="w-full h-40 object-cover rounded-xl mb-3" />
                )}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {p.featured && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-600">Featured</span>
                  )}
                  <span className="text-[10px] text-zinc-400">{p.merchant}</span>
                </div>
                <h3 className="font-bold text-zinc-900 text-sm leading-snug">{p.name}</h3>
                {p.description && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.description}</p>
                )}
                {p.price != null && (
                  <p className="text-sm font-bold text-red-600 mt-2">{formatPrice(p.price)}</p>
                )}
              </TrackedLink>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4">
        <AffiliateDisclosure />
      </div>
    </div>
  );
}
