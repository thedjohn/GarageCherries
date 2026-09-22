import { createAdminClient } from '@/lib/supabase/server';
import AffiliateDisclosure from './AffiliateDisclosure';

// Reads from affiliate_products (category = 'Inspection Tools') instead of a
// hardcoded list, so these can be managed from Admin -> Affiliate Products
// without a code change. Scoped to this one category on purpose -- this card
// is meant to stay a short, focused "bring these" list, not every product in
// the shop (see app/garage-gear/page.tsx for the full catalog).
export default async function ShopToolsCard() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('affiliate_products')
    .select('id, name, description, affiliate_url')
    .eq('category', 'Inspection Tools')
    .eq('active', true)
    .order('display_order', { ascending: true });

  const tools = data ?? [];
  if (tools.length === 0) return null;

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm my-8">
      <h3 className="font-bold text-zinc-900 mb-1 text-sm uppercase tracking-wide">Bring These to Your Inspection</h3>
      <p className="text-xs text-zinc-400 mb-4">A few inexpensive tools that catch what a walk-around alone won&apos;t</p>
      <ul className="space-y-3">
        {tools.map(tool => (
          <li key={tool.id} className="flex items-start justify-between gap-3 border-b border-zinc-50 last:border-0 pb-3 last:pb-0">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{tool.name}</p>
              <p className="text-xs text-zinc-500">{tool.description}</p>
            </div>
            <a
              href={tool.affiliate_url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex-shrink-0 bg-zinc-900 text-white font-bold text-xs text-center py-2 px-3 rounded-xl hover:bg-zinc-800 transition-colors"
            >
              View &rarr;
            </a>
          </li>
        ))}
      </ul>
      <AffiliateDisclosure />
    </div>
  );
}
