import AffiliateDisclosure from './AffiliateDisclosure';

// eBay Partner Network affiliate link -- Campaign ID belongs to the
// GarageCherries.com EPN account approved 2026-09-09. Not a secret; it's a
// public tracking param that appears in every outbound link anyway.
const EPN_CAMPAIGN_ID = '5339205808';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function EbayPartsCard({ make, model }: { make: string; model: string }) {
  const query = encodeURIComponent(`${make} ${model} parts`);
  const customId = `carguide-${slugify(make)}-${slugify(model)}`;
  const href = `https://www.ebay.com/sch/i.html?_nkw=${query}&campid=${EPN_CAMPAIGN_ID}&customid=${customId}&toolid=10001&mkcid=1&mkrid=711-53200-19255-0&siteid=0`;

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
      <h3 className="font-bold text-zinc-900 mb-1 text-sm uppercase tracking-wide">Shop Parts</h3>
      <p className="text-xs text-zinc-400 mb-4">Find {make} {model} parts on eBay</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block w-full bg-zinc-900 text-white font-bold text-sm text-center py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
      >
        Shop on eBay →
      </a>
      <AffiliateDisclosure />
    </div>
  );
}
