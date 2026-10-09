import Image from 'next/image';
import InstagramVisitTracker from '@/components/InstagramVisitTracker';

export const metadata = {
  title: 'Links',
  description: 'GarageCherries links.',
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://www.garagecherries.com/links' },
};

// Sell first and visually primary -- the free-listing offer is what the
// Instagram bio leads with. The seven Amazon inspection tools moved to
// /links/toolkit (same affiliate tag and click tracking) so this page stays
// short; that page is the last button here.
const LINKS = [
  {
    label: 'Sell Your Classic Free',
    blurb: 'Free listings through the end of 2026 — private sellers and dealers.',
    href: 'https://www.garagecherries.com/sell?utm_source=instagram&utm_medium=bio&utm_content=sell_free',
    emoji: '💲',
    primary: true,
  },
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
    blurb: 'From private sellers and trusted dealers.',
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
    label: "Buyer's Inspection Toolkit",
    blurb: 'Seven inexpensive tools that catch what a walk-around alone won’t.',
    href: '/links/toolkit',
    emoji: '🧰',
    internal: true,
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
        {LINKS.map(link => (
          <a
            key={link.href}
            href={link.href}
            {...(link.internal ? {} : { target: '_blank', rel: 'noopener noreferrer sponsored' })}
            className={link.primary
              ? 'block bg-red-600 hover:bg-red-700 rounded-2xl px-5 py-4 shadow-sm transition-colors'
              : 'block bg-white border border-zinc-100 rounded-2xl px-5 py-4 shadow-sm hover:border-red-200 transition-colors'}
          >
            <p className={`text-sm font-bold ${link.primary ? 'text-white' : 'text-zinc-900'}`}>
              <span className="mr-2">{link.emoji}</span>
              {link.label}
            </p>
            <p className={`text-xs mt-1 ${link.primary ? 'text-red-100' : 'text-zinc-500'}`}>{link.blurb}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
