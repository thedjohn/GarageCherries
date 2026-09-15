import AffiliateDisclosure from './AffiliateDisclosure';

// Amazon Associates tracking tag -- GarageCherries.com account, Associate ID
// approved 2026-09-15. Not a secret; it's a public tracking param that appears
// in every outbound link anyway.
const AMAZON_ASSOCIATE_TAG = 'garagecherrie-20';

const TOOLS = [
  {
    name: 'Compression Tester Kit',
    blurb: 'Checks cylinder compression to catch worn rings or valve issues before you buy.',
    asin: 'B00SKSAB8U',
  },
  {
    name: 'OBD2 Code Reader',
    blurb: "Reads check-engine codes the seller may not have mentioned — plug in before you even pop the hood.",
    asin: 'B01G5EA74I',
  },
  {
    name: 'Magnetic Paint Thickness Tester',
    blurb: 'A magnet pulls weaker over filler/bondo than bare metal — a quick way to spot hidden bodywork.',
    asin: 'B0DP9RFYCG',
  },
  {
    name: 'Telescoping Inspection Mirror & Light Set',
    blurb: 'See up into wheel wells and behind components without crawling underneath.',
    asin: 'B0C2C28CVL',
  },
];

function amazonLink(asin: string) {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_ASSOCIATE_TAG}`;
}

export default function ShopToolsCard() {
  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm my-8">
      <h3 className="font-bold text-zinc-900 mb-1 text-sm uppercase tracking-wide">Bring These to Your Inspection</h3>
      <p className="text-xs text-zinc-400 mb-4">A few inexpensive tools that catch what a walk-around alone won&apos;t</p>
      <ul className="space-y-3">
        {TOOLS.map(tool => (
          <li key={tool.asin} className="flex items-start justify-between gap-3 border-b border-zinc-50 last:border-0 pb-3 last:pb-0">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{tool.name}</p>
              <p className="text-xs text-zinc-500">{tool.blurb}</p>
            </div>
            <a
              href={amazonLink(tool.asin)}
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
