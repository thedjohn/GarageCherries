import { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'About Us — GarageCherries',
  description: 'GarageCherries is the premier online marketplace for classic, muscle, and collector cars. Learn about our mission and the team behind the platform.',
  alternates: { canonical: 'https://www.garagecherries.com/about' },
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'GarageCherries',
  url: 'https://www.garagecherries.com',
  description: 'GarageCherries is the premier online marketplace for classic, muscle, and collector cars — connecting serious buyers with trusted dealers across the United States.',
  foundingDate: '2026',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@garagecherries.com',
    contactType: 'customer support',
    areaServed: 'US',
    availableLanguage: 'English',
  },
};

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [{ count: listingCount }, { count: eventCount }] = await Promise.all([
    admin.from('listings').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').eq('is_sold', false).gt('expires_at', now),
    admin.from('events').select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
    <div className="max-w-4xl mx-auto px-4 py-14">
      {/* Hero */}
      <div className="text-center mb-14">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">Our Story</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-5">
          Built by enthusiasts,<br className="hidden sm:block" /> for enthusiasts.
        </h1>
        <p className="text-lg text-zinc-500 max-w-2xl mx-auto leading-relaxed">
          GarageCherries exists because finding the right classic car shouldn't require sifting through generic listing sites that weren't built for this market.
        </p>
      </div>

      {/* Mission */}
      <div className="bg-zinc-900 text-white rounded-3xl p-10 mb-12">
        <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
        <p className="text-zinc-300 leading-relaxed text-lg">
          To connect serious buyers with trusted dealers in the classic, muscle, and collector car market — and to give every car the platform it deserves, with real photography, complete specs, and honest pricing context.
        </p>
      </div>

      {/* What Makes Us Different */}
      <div className="mb-14">
        <h2 className="text-2xl font-bold text-zinc-900 mb-8">What Makes Us Different</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '🔍',
              title: 'Built for This Market',
              body: 'Every feature — from AI price assessment to the classic car encyclopedia — was designed specifically for collectors and enthusiasts, not repurposed from a generic auto platform.',
            },
            {
              icon: '🤝',
              title: 'Verified Dealers Only',
              body: 'We work exclusively with established dealers who specialize in classic and collector vehicles. No private scammers, no bait-and-switch listings.',
            },
            {
              icon: '🧠',
              title: 'AI-Powered Research',
              body: 'Our AI tools help buyers understand fair market value, identify red flags, and draft the right questions — so you negotiate from knowledge, not guesswork.',
            },
            {
              icon: '📖',
              title: 'Encyclopedia Depth',
              body: 'Over 50 make and model guides with real history, specs, buying tips, and price ranges — written for people who actually care about these cars.',
            },
            {
              icon: '📣',
              title: 'Car Alerts',
              body: 'Save your search criteria and get notified the moment a matching car lists. Never miss the right car because you weren\'t watching that day.',
            },
            {
              icon: '💰',
              title: 'Transparent Pricing',
              body: 'Price history on every listing, market context from our AI, and comparable sales data — so you know exactly where any car stands in the market.',
            },
          ].map(item => (
            <div key={item.title} className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-zinc-900 mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* By the Numbers */}
      <div className="bg-red-50 border border-red-100 rounded-3xl p-10 mb-14">
        <h2 className="text-2xl font-bold text-zinc-900 mb-8 text-center">The Platform</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { stat: (listingCount ?? 0).toLocaleString(), label: 'Active Listings' },
            { stat: '54', label: 'Model Guides' },
            { stat: '6', label: "Buyer's Guides" },
            { stat: (eventCount ?? 0).toLocaleString(), label: 'Car Events' },
          ].map(item => (
            <div key={item.label}>
              <p className="text-4xl font-extrabold text-red-600 mb-1">{item.stat}</p>
              <p className="text-sm text-zinc-500 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900 mb-3">Ready to find your car?</h2>
        <p className="text-zinc-500 mb-6">Browse thousands of classic cars from trusted dealers across the country.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/listings" className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition-colors">
            Browse Listings
          </Link>
          <Link href="/contact" className="border border-zinc-200 hover:border-red-300 text-zinc-700 font-semibold px-8 py-3 rounded-xl transition-colors">
            Get in Touch
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
