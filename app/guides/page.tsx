import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Classic Car Buyer's Guides",
  description: "How to buy a classic car online: what to inspect, questions to ask dealers, red flags to watch for, and how to negotiate. Free guides for first-time and experienced collectors.",
  alternates: { canonical: 'https://www.garagecherries.com/guides' },
};

const GUIDES = [
  {
    slug: 'how-to-buy-a-classic-car-online',
    title: 'How to Buy a Classic Car Online',
    subtitle: 'A step-by-step guide for first-time and experienced buyers',
    readTime: '8 min read',
    category: 'Getting Started',
    intro: 'Buying a classic car online is different from buying a new car at a dealership. The stakes are higher, the information is more complex, and the seller is often hundreds of miles away. This guide walks you through every step from search to handshake.',
  },
  {
    slug: 'pre-purchase-inspection-checklist',
    title: 'Pre-Purchase Inspection: The Complete Checklist',
    subtitle: "What to check before you hand over a check",
    readTime: '10 min read',
    category: 'Inspection',
    intro: 'A thorough pre-purchase inspection can save you tens of thousands of dollars. This checklist covers body, frame, engine, drivetrain, electrical, and documentation — with specific items to check on common muscle car platforms.',
  },
  {
    slug: 'questions-to-ask-a-classic-car-dealer',
    title: '20 Questions to Ask Before You Buy',
    subtitle: "What every serious buyer should know before making an offer",
    readTime: '5 min read',
    category: 'Due Diligence',
    intro: 'The questions you ask — and the answers you get — reveal more about a car than the listing photos ever will. Here are the 20 questions that separate serious buyers from casual shoppers.',
  },
  {
    slug: 'classic-car-red-flags',
    title: 'Red Flags: When to Walk Away',
    subtitle: "Signs that a listing, seller, or car isn't what it claims to be",
    readTime: '7 min read',
    category: 'Safety',
    intro: "The classic car market has more than its share of clones, flood cars, title-washed vehicles, and overpriced projects. This guide helps you spot the warning signs before you've wired the money.",
  },
  {
    slug: 'how-to-negotiate-classic-car-price',
    title: 'How to Negotiate a Classic Car Price',
    subtitle: 'Strategies that actually work — without burning the relationship',
    readTime: '6 min read',
    category: 'Negotiation',
    intro: "Classic car sellers are often emotionally attached to their vehicles. Understanding that psychology — and how to work with it rather than against it — is the key to getting a fair deal on a car both parties feel good about.",
  },
  {
    slug: 'classic-car-shipping-guide',
    title: 'Shipping a Classic Car: What You Need to Know',
    subtitle: 'Enclosed vs. open transport, how to choose a transporter, and what to document',
    readTime: '6 min read',
    category: 'Logistics',
    intro: 'Most classic car transactions today involve shipping the vehicle across state lines. This guide covers how to choose a transporter, what to inspect on arrival, and how to file a claim if damage occurs.',
  },
  {
    slug: 'classic-car-financing',
    title: 'Classic Car Financing: How It Works',
    subtitle: 'Why collector car loans are different from a regular auto loan',
    readTime: '6 min read',
    category: 'Financing',
    intro: 'Classic car loans are underwritten differently than a loan on a daily driver — lenders look at collector value, not depreciation curves. This guide covers how specialty lenders evaluate a car, what to expect on rates and terms, and when other financing options make more sense.',
  },
  {
    slug: 'auction-vs-private-sale',
    title: 'Auction vs. Private Sale: Which Is Right for You?',
    subtitle: 'How live auctions, online auctions, and private sales actually differ for a buyer',
    readTime: '7 min read',
    category: 'Buying Method',
    intro: "Barrett-Jackson, Bring a Trailer, and a private listing on GarageCherries are three very different buying experiences — different costs, different due diligence burden, and different negotiating leverage. Here's how each actually works.",
  },
  {
    slug: 'how-to-value-a-muscle-car',
    title: 'How to Value a Muscle Car',
    subtitle: "What actually drives price — and where sellers and buyers overvalue",
    readTime: '7 min read',
    category: 'Valuation',
    intro: "Two seemingly identical muscle cars can be worth wildly different amounts. Condition, documentation, and originality drive value far more than most buyers realize. This guide walks through how to research comps and value a car realistically.",
  },
  {
    slug: 'classic-car-insurance-guide',
    title: 'Classic Car Insurance: What You Need to Know',
    subtitle: 'Agreed value vs. actual cash value, and why standard auto insurance falls short',
    readTime: '5 min read',
    category: 'Insurance',
    intro: "Insuring a classic car on a standard policy can leave you badly underpaid after a total loss. This guide explains agreed-value coverage, the usage restrictions specialty insurers require, and how to keep premiums reasonable.",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  'Getting Started': 'bg-blue-100 text-blue-700',
  'Inspection': 'bg-amber-100 text-amber-700',
  'Due Diligence': 'bg-green-100 text-green-700',
  'Safety': 'bg-red-100 text-red-700',
  'Negotiation': 'bg-purple-100 text-purple-700',
  'Logistics': 'bg-zinc-100 text-zinc-600',
  'Financing': 'bg-teal-100 text-teal-700',
  'Buying Method': 'bg-indigo-100 text-indigo-700',
  'Valuation': 'bg-orange-100 text-orange-700',
  'Insurance': 'bg-rose-100 text-rose-700',
};

export default function GuidesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="mb-12 text-center">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-3">GarageCherries</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4">Classic Car Buyer's Guides</h1>
        <p className="text-lg text-zinc-500 max-w-2xl mx-auto">
          Everything you need to know before you buy — from first search to final handshake. Written for serious buyers, not casual browsers.
        </p>
      </div>

      {/* Guides grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {GUIDES.map(guide => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="bg-white border border-zinc-100 rounded-2xl p-6 hover:border-red-200 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLORS[guide.category] ?? 'bg-zinc-100 text-zinc-600'}`}>
                {guide.category}
              </span>
              <span className="text-xs text-zinc-400">{guide.readTime}</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 group-hover:text-red-600 transition-colors mb-1">
              {guide.title}
            </h2>
            <p className="text-sm text-zinc-500 mb-3">{guide.subtitle}</p>
            <p className="text-sm text-zinc-400 line-clamp-2">{guide.intro}</p>
            <div className="flex items-center gap-1 mt-4 text-xs font-semibold text-red-600 group-hover:gap-2 transition-all">
              Read guide
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 bg-red-600 rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">Ready to start looking?</h2>
        <p className="text-red-100 mb-6">Browse classic cars for sale from private sellers and vetted dealers worldwide.</p>
        <Link href="/listings" className="inline-block bg-white text-red-600 font-bold px-8 py-3 rounded-xl hover:bg-red-50 transition-colors">
          Browse Listings
        </Link>
      </div>
    </div>
  );
}
