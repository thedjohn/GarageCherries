import Link from 'next/link';
import AffiliateDisclosure from '@/components/AffiliateDisclosure';
import TrackedLink from '@/components/TrackedLink';

export const metadata = {
  title: "Buyer's Inspection Toolkit",
  description: 'Inexpensive tools that catch what a walk-around alone won’t.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://www.garagecherries.com/links/toolkit' },
};

// Amazon Associates tracking tag for clicks that come from Instagram/social,
// kept separate from the site's own tag (garagecherrie-20 in
// components/ShopToolsCard.tsx) so Associates Central can report social
// traffic independently. Moved here from /links, which now links to this
// page as a single "Buyer's Inspection Toolkit" button.
const AMAZON_SOCIAL_TAG = 'garagecherriesig-20';

function amazonLink(asin: string) {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_SOCIAL_TAG}`;
}

const TOOLS = [
  {
    label: 'OBD2 Code Reader',
    // Same blurb as components/ShopToolsCard.tsx, kept in sync manually.
    blurb: "Reads check-engine codes the seller may not have mentioned — plug in before you even pop the hood.",
    href: amazonLink('B01G5EA74I'),
    emoji: '🔌',
  },
  {
    label: 'BlueDriver Bluetooth Pro Scanner',
    // Not in ShopToolsCard.tsx -- Instagram-only upgrade pick, added alongside
    // the cheaper OBD2 reader above rather than replacing it.
    blurb: 'The upgrade pick — pairs over Bluetooth and pulls ABS/SRS/TPMS codes most basic readers miss, with verified repair reports.',
    href: amazonLink('B00652G4TS'),
    emoji: '📡',
  },
  {
    label: 'Compression Tester Kit',
    blurb: 'Checks cylinder compression to catch worn rings or valve issues before you buy.',
    href: amazonLink('B00SKSAB8U'),
    emoji: '🛠️',
  },
  {
    label: 'Magnetic Paint Thickness Tester',
    blurb: 'A magnet pulls weaker over filler/bondo than bare metal — a quick way to spot hidden bodywork.',
    href: amazonLink('B0DP9RFYCG'),
    emoji: '🧲',
  },
  {
    label: 'Telescoping Inspection Mirror & Light Set',
    blurb: 'See up into wheel wells and behind components without crawling underneath.',
    href: amazonLink('B0C2C28CVL'),
    emoji: '🔦',
  },
  {
    label: 'Smoke Leak Tester',
    // Not in ShopToolsCard.tsx -- Instagram-only pick, chosen for how visual
    // it is on video (smoke pouring out of a vacuum/EVAP leak in real time).
    blurb: 'Pumps visible smoke through the intake to show exactly where a hidden vacuum or EVAP leak is coming from.',
    href: amazonLink('B0DNRY9NCV'),
    emoji: '💨',
  },
  {
    label: 'Borescope Inspection Camera',
    // Not in ShopToolsCard.tsx -- Instagram-only pick.
    blurb: 'A flexible camera on a cable that reaches into cylinders, frame rails, and behind panels to spot hidden rust or damage without disassembly.',
    href: amazonLink('B0B28HRSBP'),
    emoji: '🔬',
  },
];

export default function LinksToolkitPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <Link href="/links" className="inline-block text-xs font-semibold text-zinc-500 hover:text-red-600 mb-6">
        &larr; Back to links
      </Link>
      <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">🧰 Buyer&apos;s Inspection Toolkit</h1>
      <p className="text-sm text-zinc-500 mb-8">Inexpensive tools that catch what a walk-around alone won&apos;t.</p>

      <div className="space-y-3">
        {TOOLS.map(tool => (
          <TrackedLink
            key={tool.href}
            href={tool.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="block bg-white border border-zinc-100 rounded-2xl px-5 py-4 shadow-sm hover:border-red-200 transition-colors"
            eventName="affiliate_click"
            eventParams={{ label: tool.label, source: 'links_page' }}
          >
            <p className="text-sm font-bold text-zinc-900">
              <span className="mr-2">{tool.emoji}</span>
              {tool.label}
            </p>
            <p className="text-xs text-zinc-500 mt-1">{tool.blurb}</p>
          </TrackedLink>
        ))}
      </div>

      <div className="mt-8">
        <AffiliateDisclosure />
      </div>
    </div>
  );
}
