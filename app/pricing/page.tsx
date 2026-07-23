import { Metadata } from 'next';
import Link from 'next/link';
import { getSiteSettings } from '@/lib/siteSettings';

export const metadata: Metadata = {
  title: 'Pricing — Dealer Plans & Private Seller Options',
  description: 'Affordable classic car listing plans for dealers and private sellers. Post your classic car on GarageCherries starting at $49. Dealer subscriptions from $49/month.',
  alternates: { canonical: 'https://www.garagecherries.com/pricing' },
};

const DEALER_PLANS = [
  {
    name: 'Starter',
    price: 49,
    description: 'Perfect for small dealers just getting started.',
    listings: 5,
    featured: 0,
    features: [
      '5 active listings',
      'Dealer profile page',
      'Photo gallery (up to 30 photos/listing)',
      'Buyer inquiry management',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 99,
    description: 'Our most popular plan for growing dealerships.',
    listings: 25,
    featured: 3,
    features: [
      '25 active listings',
      '3 featured listing slots',
      'Dealer profile page',
      'Photo gallery (up to 30 photos/listing)',
      'Priority search placement',
      'Priority email & phone support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Unlimited',
    price: 199,
    description: 'For high-volume dealers who want maximum exposure.',
    listings: Infinity,
    featured: 10,
    features: [
      'Unlimited active listings',
      '10 featured listing slots',
      'Verified Dealer badge',
      'Dealer profile page',
      'Photo gallery (up to 30 photos/listing)',
      'Top search placement',
      'Homepage spotlight eligibility',
      'Dedicated account manager',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const ADDONS = [
  { name: 'Featured Listing Upgrade', price: '$25', per: 'per listing / month', desc: 'Pin any listing to the top of search results with a Featured badge.' },
  { name: 'Homepage Spotlight', price: '$75', per: 'per week', desc: 'Feature your listing in the homepage hero carousel seen by all visitors.' },
  { name: 'Bold Search Result', price: '$10', per: 'per listing / month', desc: 'Make your listing stand out with a highlighted border in search results.' },
];

const FAQS = [
  { q: 'Is there a free trial?', a: 'Yes — all dealer plans include a 14-day free trial. No credit card required to start.' },
  { q: 'Can I change plans later?', a: 'Absolutely. You can upgrade or downgrade at any time. Changes take effect on your next billing cycle.' },
  { q: 'How does billing work?', a: 'Plans are billed monthly. You can cancel any time with no cancellation fees.' },
  { q: 'What counts as a "featured" listing?', a: 'Featured listings appear at the top of search results and category pages, and carry a red Featured badge visible to all buyers.' },
  { q: 'Do you take a commission on sales?', a: 'Never. GarageCherries charges only for the subscription or listing fee — you keep 100% of the sale price.' },
  { q: 'Can private sellers list cars too?', a: 'Yes. Private sellers can post individual listings for a one-time fee. See our private seller options below.' },
];

export default async function PricingPage() {
  const settings = await getSiteSettings();
  const isPromo = new Date() < new Date(settings.promoApplicationCutoff);
  const promoExpiresLabel = new Date(settings.promoExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const promoCutoffLabel = new Date(settings.promoApplicationCutoff).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const trialLabel = isPromo
    ? `Free through ${promoExpiresLabel}`
    : `${settings.advertiserTrialDays}-day free trial`;
  return (
    <div className="bg-zinc-50 min-h-screen">

      {/* Hero */}
      <section className="bg-zinc-900 text-white py-16 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-red-400 text-sm font-bold uppercase tracking-widest mb-3">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Simple, Transparent Pricing
          </h1>
          <p className="text-zinc-300 text-lg max-w-xl mx-auto">
            No commissions. No hidden fees. Just flat-rate plans that put more money in your pocket.
          </p>
        </div>
      </section>

      {/* 250th Birthday Promo banner */}
      <div className="bg-zinc-800 text-white text-center py-3 text-sm font-semibold">
        🇺🇸 250th Birthday Promo — Dealers, private sellers &amp; advertisers get free access through {promoExpiresLabel}. Sign up before {promoCutoffLabel}.{' '}
        <Link href="/account/signup?promo=250th" className="underline text-red-400 hover:text-red-300">Claim now →</Link>
      </div>

      {/* Competitor comparison banner. AutoTrader doesn't publish official rates —
          range based on dealer-forum reports (DealerRefresh) and AutoTrader B2B
          package tiers, verified 2026-07-02. Re-check periodically. */}
      <div className="bg-red-600 text-white text-center py-3 text-sm font-semibold">
        AutoTrader charges dealers $450–$2,000/month. GarageCherries starts at just $49/month.
      </div>
      <p className="text-center text-xs text-zinc-400 py-1.5 bg-zinc-50">
        *Estimated range based on publicly available dealer packages and industry reports, not an official AutoTrader rate card.
      </p>

      {/* Dealer Plans */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-zinc-900">Dealer Plans</h2>
          <p className="text-zinc-500 mt-2">Everything you need to sell more classic cars. Billed monthly, cancel any time.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {DEALER_PLANS.map(plan => (
            <div key={plan.name} className={`relative bg-white rounded-2xl border-2 shadow-sm flex flex-col ${
              plan.highlight ? 'border-red-500 shadow-red-100 shadow-lg' : 'border-zinc-100'
            }`}>
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8 flex-1">
                <h3 className="text-xl font-extrabold text-zinc-900 mb-1">{plan.name}</h3>
                <p className="text-zinc-400 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-5xl font-extrabold text-zinc-900">${plan.price}</span>
                  <span className="text-zinc-400 text-sm">/month</span>
                </div>

                <div className="flex gap-4 mb-6 text-sm">
                  <div className="bg-zinc-50 rounded-xl px-4 py-2 text-center flex-1">
                    <p className="font-extrabold text-zinc-900 text-lg">
                      {plan.listings === Infinity ? '∞' : plan.listings}
                    </p>
                    <p className="text-zinc-400 text-xs">Listings</p>
                  </div>
                  <div className="bg-zinc-50 rounded-xl px-4 py-2 text-center flex-1">
                    <p className="font-extrabold text-zinc-900 text-lg">{plan.featured}</p>
                    <p className="text-zinc-400 text-xs">Featured</p>
                  </div>
                </div>

                <ul className="space-y-3">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600">
                      <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-8 pt-0">
                <Link
                  href="/dealer/login"
                  className={`block w-full text-center font-bold py-3 rounded-xl transition-colors ${
                    plan.highlight
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'border-2 border-red-600 text-red-600 hover:bg-red-50'
                  }`}
                >
                  {plan.cta}
                </Link>
                <p className="text-xs text-zinc-400 text-center mt-2">14-day free trial · No credit card required</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add-ons */}
      <section className="bg-white border-y border-zinc-100 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-zinc-900">Listing Add-Ons</h2>
            <p className="text-zinc-500 mt-2 text-sm">Available on any plan to boost individual listings.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {ADDONS.map(addon => (
              <div key={addon.name} className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                <p className="font-extrabold text-zinc-900 mb-1">{addon.name}</p>
                <p className="text-red-600 font-bold text-xl mb-1">{addon.price} <span className="text-zinc-400 text-sm font-normal">{addon.per}</span></p>
                <p className="text-zinc-500 text-sm">{addon.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Private Seller */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-zinc-900">Private Seller Listings</h2>
          <p className="text-zinc-500 mt-2 text-sm">Not a dealer? Post your car with a one-time fee — listed until it sells, no subscription needed.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border-2 border-zinc-100 p-8 text-center shadow-sm">
            <h3 className="font-extrabold text-zinc-900 text-lg mb-1">Basic Listing</h3>
            <p className="text-4xl font-extrabold text-zinc-900 my-4">$49</p>
            <p className="text-zinc-400 text-sm mb-6">One-time fee · listed until sold</p>
            <ul className="text-sm text-zinc-600 space-y-2 text-left mb-8">
              {['Active for 30 days at a time', 'Up to 30 photos', 'Buyer inquiries direct to your email', 'Renew for free every 30 days until it sells'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/sell" className="block w-full border-2 border-red-600 text-red-600 hover:bg-red-50 font-bold py-3 rounded-xl transition-colors">
              Post Your Car
            </Link>
          </div>

          <div className="bg-white rounded-2xl border-2 border-red-500 p-8 text-center shadow-lg shadow-red-100 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-red-600 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">Best Value</span>
            </div>
            <h3 className="font-extrabold text-zinc-900 text-lg mb-1">Featured Listing</h3>
            <p className="text-4xl font-extrabold text-zinc-900 my-4">$99</p>
            <p className="text-zinc-400 text-sm mb-6">One-time fee · listed until sold</p>
            <ul className="text-sm text-zinc-600 space-y-2 text-left mb-8">
              {['Everything in Basic', 'Featured badge on your listing', 'Top of search results', 'Homepage visibility', 'Sell faster'].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/sell" className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors">
              Post Featured Car
            </Link>
          </div>
        </div>
      </section>

      {/* Advertiser */}
      <section className="bg-white border-y border-zinc-100 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-zinc-900 mb-2">Advertise on GarageCherries</h2>
            <p className="text-zinc-500 text-sm mb-2">Reach a passionate audience of classic, muscle, and collector car enthusiasts across the USA.</p>
            <p className="text-red-600 text-sm font-semibold">🇺🇸 250th Birthday Promo: Sign up before {promoCutoffLabel} for free access through {promoExpiresLabel}.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              { name: 'Starter',   price: '$79',  per: '/mo', radius: '15-mile radius' },
              { name: 'Metro',     price: '$139', per: '/mo', radius: '30-mile radius' },
              { name: 'Regional',  price: '$219', per: '/mo', radius: '60-mile radius' },
              { name: 'Statewide', price: '$349', per: '/mo', radius: 'Entire state' },
            ].map(t => (
              <div key={t.name} className="bg-zinc-50 rounded-2xl border border-zinc-100 p-6 text-center">
                <p className="font-extrabold text-zinc-900 mb-1">{t.name}</p>
                <p className="text-3xl font-extrabold text-zinc-900 my-3">{t.price}<span className="text-sm font-normal text-zinc-400">{t.per}</span></p>
                <p className="text-xs text-zinc-500">{t.radius}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/advertiser/signup"
              className="inline-block bg-zinc-900 hover:bg-zinc-800 text-white font-bold px-8 py-3 rounded-xl transition-colors">
              Start Free Trial
            </Link>
            <p className="text-xs text-zinc-400 mt-3">{trialLabel} · No credit card required · Geographic ad targeting included</p>
          </div>
        </div>
      </section>

      {/* Stripe coming soon */}
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-zinc-400 text-sm">
          💳 Online payments via Stripe coming soon. To get started today, contact us at{' '}
          <a href="mailto:contact-us@garagecherries.com" className="text-red-600 hover:underline">contact-us@garagecherries.com</a>.
        </p>
      </div>

      {/* No commission callout */}
      <section className="bg-zinc-900 text-white py-12 text-center">
        <div className="max-w-2xl mx-auto px-4">
          <p className="text-4xl font-extrabold mb-3">0% Commission</p>
          <p className="text-zinc-300 text-lg">We never take a cut of your sale. You set the price, you keep every dollar.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-extrabold text-zinc-900 text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {FAQS.map(faq => (
            <div key={faq.q} className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
              <h3 className="font-bold text-zinc-900 mb-2">{faq.q}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-red-600 text-white py-16 text-center">
        <div className="max-w-xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold mb-3">Ready to Start Selling?</h2>
          <p className="text-red-100 mb-8">Join hundreds of classic car dealers already on GarageCherries.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/dealer/login"
              className="bg-white text-red-600 font-bold px-8 py-3 rounded-xl hover:bg-red-50 transition-colors">
              Start Free Trial
            </Link>
            <Link href="/sell"
              className="border-2 border-white text-white font-bold px-8 py-3 rounded-xl hover:bg-red-700 transition-colors">
              Post a Single Listing
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
