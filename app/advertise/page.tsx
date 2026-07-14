import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advertise',
  description: 'Reach classic car buyers in your city the moment they\'re shopping. Show your ad to serious buyers browsing real listings.',
};

const TIERS = [
  {
    id: 'starter', name: 'Starter', price: 79, annual: 790,
    radius: '15-mile radius', badge: null,
    features: ['1 active ad', 'Listing detail pages', 'Impression tracking'],
  },
  {
    id: 'metro', name: 'Metro', price: 139, annual: 1390,
    radius: '30-mile radius', badge: 'Most Popular',
    features: ['1 active ad', 'All page placements', 'Impression & click tracking', 'Priority rotation'],
  },
  {
    id: 'regional', name: 'Regional', price: 219, annual: 2190,
    radius: '60-mile radius', badge: null,
    features: ['2 active ads', 'All page placements', 'Impression & click tracking', 'Priority rotation'],
  },
  {
    id: 'statewide', name: 'Statewide', price: 349, annual: 3490,
    radius: 'Entire state', badge: null,
    features: ['2 active ads', 'All page placements', 'Impression & click tracking', 'Highest priority rotation'],
  },
];

const CATEGORIES = [
  { icon: '✨', label: 'Auto Detailing', desc: 'Connect with buyers who want their new purchase looking perfect.' },
  { icon: '🛡️', label: 'Classic Car Insurance', desc: 'Reach buyers who need specialty coverage the moment they\'re shopping.' },
  { icon: '💰', label: 'Financing', desc: 'Put your rates in front of buyers at the exact moment they\'re deciding.' },
  { icon: '🚛', label: 'Transport & Shipping', desc: 'Buyers shopping out-of-state need you. Be there when they are.' },
  { icon: '🏚️', label: 'Storage', desc: 'Classic car owners need climate-controlled space — you have it.' },
  { icon: '🔧', label: 'Restoration', desc: 'Project car buyers are looking for exactly your expertise.' },
  { icon: '🔍', label: 'Pre-Purchase Inspection', desc: 'Buyers sending $50k+ want peace of mind. That\'s your pitch.' },
];

export default function AdvertisePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <span className="inline-block bg-red-100 text-red-700 font-bold text-xs uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
          Local Advertising
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4 leading-tight">
          Reach car buyers in your city<br className="hidden md:block" />
          <span className="text-red-600"> the moment they're shopping</span>
        </h1>
        <p className="text-xl text-zinc-500 max-w-2xl mx-auto mb-8">
          GarageCherries visitors are actively shopping for classic cars worth $20k–$200k.
          Your ad appears while they're browsing real listings — not weeks later on a social feed.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/advertiser/signup"
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl text-base transition-colors">
            Start 14-Day Free Trial
          </Link>
          <Link href="/advertiser/login"
            className="border-2 border-zinc-200 hover:border-zinc-300 text-zinc-700 font-bold px-8 py-3.5 rounded-xl text-base transition-colors">
            Sign In
          </Link>
        </div>
        <p className="text-sm text-zinc-400 mt-3">No credit card required · Cancel anytime</p>
      </div>

      {/* Who it's for */}
      <div className="mb-16">
        <h2 className="text-2xl font-extrabold text-zinc-900 text-center mb-2">Who advertises on GarageCherries</h2>
        <p className="text-zinc-500 text-center mb-8">Any business that serves classic car buyers and owners</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORIES.map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
              <div className="text-2xl mb-2">{c.icon}</div>
              <h3 className="font-bold text-zinc-900 mb-1">{c.label}</h3>
              <p className="text-sm text-zinc-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-zinc-50 rounded-2xl p-8 mb-16">
        <h2 className="text-2xl font-extrabold text-zinc-900 text-center mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            { step: '1', title: 'Create your ad', desc: 'Upload your logo, write a headline, add your CTA. Live preview shows exactly how it looks.' },
            { step: '2', title: 'Set your radius', desc: 'Pick how far you want to reach — 15, 30, or 60 miles from your location, or the entire state.' },
            { step: '3', title: 'Buyers see you', desc: 'Your ad appears on listing detail pages when a buyer is viewing a car near you.' },
          ].map(s => (
            <div key={s.step}>
              <div className="w-10 h-10 rounded-full bg-red-600 text-white font-extrabold text-lg flex items-center justify-center mx-auto mb-3">{s.step}</div>
              <h3 className="font-bold text-zinc-900 mb-1">{s.title}</h3>
              <p className="text-sm text-zinc-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="mb-16">
        <h2 className="text-2xl font-extrabold text-zinc-900 text-center mb-2">Simple, transparent pricing</h2>
        <p className="text-zinc-500 text-center mb-8">Annual billing saves 2 months. Cancel anytime.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TIERS.map(t => (
            <div key={t.id} className={`bg-white rounded-2xl border-2 shadow-sm p-6 relative ${t.badge ? 'border-red-500' : 'border-zinc-100'}`}>
              {t.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                  {t.badge}
                </span>
              )}
              <h3 className="font-extrabold text-zinc-900 text-lg">{t.name}</h3>
              <p className="text-zinc-500 text-sm mb-3">{t.radius}</p>
              <p className="text-3xl font-extrabold text-zinc-900 mb-1">${t.price}<span className="text-base font-normal text-zinc-500">/mo</span></p>
              <p className="text-xs text-zinc-400 mb-4">or ${t.annual}/yr (save ${t.price * 2})</p>
              <ul className="space-y-1.5 mb-6">
                {t.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-600">
                    <svg className="w-4 h-4 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={`/advertiser/signup?tier=${t.id}`}
                className={`block w-full text-center font-bold text-sm py-2.5 rounded-xl transition-colors ${t.badge ? 'bg-red-600 hover:bg-red-700 text-white' : 'border-2 border-zinc-200 hover:border-red-300 text-zinc-700 hover:text-red-600'}`}>
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-zinc-900 rounded-2xl p-10 text-center text-white">
        <h2 className="text-2xl font-extrabold mb-3">Ready to reach more customers?</h2>
        <p className="text-zinc-400 mb-6">Join local businesses already advertising to GarageCherries buyers.</p>
        <Link href="/advertiser/signup"
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl transition-colors">
          Start Free Trial
        </Link>
      </div>
    </div>
  );
}
