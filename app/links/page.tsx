import Image from 'next/image';
import AffiliateDisclosure from '@/components/AffiliateDisclosure';
import InstagramVisitTracker from '@/components/InstagramVisitTracker';
import TrackedLink from '@/components/TrackedLink';

export const metadata = {
  title: 'Links',
  description: 'GarageCherries links.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://www.garagecherries.com/links' },
};

// Amazon Associates tracking tag for clicks that come from Instagram/social,
// kept separate from the site's own tag (garagecherrie-20 in
// components/ShopToolsCard.tsx) so Associates Central can report social
// traffic independently.
const AMAZON_SOCIAL_TAG = 'garagecherriesig-20';

function amazonLink(asin: string) {
  return `https://www.amazon.com/dp/${asin}?tag=${AMAZON_SOCIAL_TAG}`;
}

const LINKS = [
  {
    // Matches what Instagram posts/stories point people to, so a follower
    // tapping the bio link from a Pick of the Day post lands on today's car.
    label: "Today's Pick of the Day",
    blurb: 'A new classic, muscle, or collector car featured every day.',
    href: 'https://www.garagecherries.com/car-of-the-day?utm_source=instagram&utm_medium=bio&utm_content=pick_of_the_day',
    emoji: '🍒',
  },
  {
    label: 'Browse Cars for Sale',
    blurb: 'Live listings from trusted dealers nationwide.',
    href: 'https://www.garagecherries.com/listings?utm_source=instagram&utm_medium=bio',
    emoji: '🚗',
  },
  {
    label: 'Car Shows Near You',
    blurb: 'Car shows, cruise nights, and swap meets in every state.',
    href: 'https://www.garagecherries.com/events?utm_source=instagram&utm_medium=bio&utm_content=car_shows',
    emoji: '🏁',
  },
  {
    label: 'Sell Your Classic Free',
    blurb: 'Free listings through the end of 2026 — private sellers and dealers.',
    href: 'https://www.garagecherries.com/sell?utm_source=instagram&utm_medium=bio&utm_content=sell_free',
    emoji: '💲',
  },
  {
    label: 'OBD2 Code Reader',
    // Same blurb as components/ShopToolsCard.tsx, kept in sync manually.
    blurb: "Reads check-engine codes the seller may not have mentioned — plug in before you even pop the hood.",
    href: amazonLink('B01G5EA74I'),
    emoji: '🔌',
    affiliate: true,
  },
  {
    label: 'BlueDriver Bluetooth Pro Scanner',
    // Not in ShopToolsCard.tsx -- Instagram-only upgrade pick, added alongside
    // the cheaper OBD2 reader above rather than replacing it.
    blurb: 'The upgrade pick — pairs over Bluetooth and pulls ABS/SRS/TPMS codes most basic readers miss, with verified repair reports.',
    href: amazonLink('B00652G4TS'),
    emoji: '📡',
    affiliate: true,
  },
  {
    label: 'Compression Tester Kit',
    blurb: 'Checks cylinder compression to catch worn rings or valve issues before you buy.',
    href: amazonLink('B00SKSAB8U'),
    emoji: '🛠️',
    affiliate: true,
  },
  {
    label: 'Magnetic Paint Thickness Tester',
    blurb: 'A magnet pulls weaker over filler/bondo than bare metal — a quick way to spot hidden bodywork.',
    href: amazonLink('B0DP9RFYCG'),
    emoji: '🧲',
    affiliate: true,
  },
  {
    label: 'Telescoping Inspection Mirror & Light Set',
    blurb: 'See up into wheel wells and behind components without crawling underneath.',
    href: amazonLink('B0C2C28CVL'),
    emoji: '🔦',
    affiliate: true,
  },
  {
    label: 'Smoke Leak Tester',
    // Not in ShopToolsCard.tsx -- Instagram-only pick, chosen for how visual
    // it is on video (smoke pouring out of a vacuum/EVAP leak in real time).
    blurb: 'Pumps visible smoke through the intake to show exactly where a hidden vacuum or EVAP leak is coming from.',
    href: amazonLink('B0DNRY9NCV'),
    emoji: '💨',
    affiliate: true,
  },
  {
    label: 'Borescope Inspection Camera',
    // Not in ShopToolsCard.tsx -- Instagram-only pick.
    blurb: 'A flexible camera on a cable that reaches into cylinders, frame rails, and behind panels to spot hidden rust or damage without disassembly.',
    href: amazonLink('B0B28HRSBP'),
    emoji: '🔬',
    affiliate: true,
  },
];

export default function LinksPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-12 text-center">
      <InstagramVisitTracker />
      <Image
        src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png"
        alt="GarageCherries"
        width={64}
        height={64}
        unoptimized
        className="mx-auto mb-4"
      />
      <h1 className="text-2xl font-extrabold text-zinc-900 mb-1">GarageCherries</h1>
      <p className="text-sm text-zinc-500 mb-8">Classic, muscle &amp; collector cars</p>

      <div className="space-y-3">
        {LINKS.map(link => {
          const cardClassName = "block bg-white border border-zinc-100 rounded-2xl px-5 py-4 shadow-sm hover:border-red-200 transition-colors";
          const cardContent = (
            <>
              <p className="text-sm font-bold text-zinc-900">
                <span className="mr-2">{link.emoji}</span>
                {link.label}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{link.blurb}</p>
            </>
          );
          return link.affiliate ? (
            <TrackedLink
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={cardClassName}
              eventName="affiliate_click"
              eventParams={{ label: link.label, source: 'links_page' }}
            >
              {cardContent}
            </TrackedLink>
          ) : (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className={cardClassName}
            >
              {cardContent}
            </a>
          );
        })}
      </div>

      <div className="mt-8">
        <AffiliateDisclosure />
      </div>
    </div>
  );
}
