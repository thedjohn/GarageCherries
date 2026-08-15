'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Signup failed. Please try again.');
        setStatus('error');
      } else {
        setStatus('success');
        setEmail('');
      }
    } catch {
      setErrorMsg('Signup failed. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return <p className="text-sm text-green-400">You're in! Check your inbox for updates.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 mt-2">
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-red-500"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
      >
        {status === 'loading' ? 'Signing up…' : 'Subscribe'}
      </button>
      {status === 'error' && <p className="text-xs text-red-400 mt-1 w-full">{errorMsg}</p>}
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="bg-zinc-900 text-zinc-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Newsletter banner */}
        <div className="bg-zinc-800 rounded-xl px-6 py-5 mb-10">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">Stay in the loop</p>
              <p className="text-zinc-400 text-xs mt-0.5">New listings, car news, and collector market updates — straight to your inbox.</p>
            </div>
            <div className="md:w-96 w-full">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png" alt="GarageCherries" width={32} height={32} unoptimized />
              <span className="text-white font-bold">Garage<span className="text-red-500">Cherries</span></span>
            </div>
            <p className="text-sm leading-relaxed">The premier marketplace for classic, muscle, and collector cars. Buy, sell, and discover automotive history.</p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href="https://www.facebook.com/GarageCherries"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GarageCherries on Facebook"
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/garagecherries"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GarageCherries on Instagram"
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800 hover:bg-red-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 9.837a3.837 3.837 0 1 1 0-7.674 3.837 3.837 0 0 1 0 7.674zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                </svg>
              </a>
              <a
                href="https://www.youtube.com/@garagecherries"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GarageCherries on YouTube"
                className="inline-flex items-center justify-center w-16 h-16"
              >
                {/* Official YouTube icon mark (red rounded-square + white play
                    triangle), used as-is per YouTube's branding guidelines --
                    no recoloring, no separate background badge, since the mark
                    already includes its own solid background. */}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 34" className="w-14 h-10">
                  <path fill="#FF0000" d="M47 5.3A6 6 0 0 0 42.8 1C39 0 24 0 24 0S9 0 5.2 1A6 6 0 0 0 1 5.3 62 62 0 0 0 0 17a62 62 0 0 0 1 11.7A6 6 0 0 0 5.2 33C9 34 24 34 24 34s15 0 18.8-1a6 6 0 0 0 4.2-4.3A62 62 0 0 0 48 17a62 62 0 0 0-1-11.7Z"/>
                  <path fill="#FFF" d="M19 24V10l13 7Z"/>
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Browse</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/listings" className="hover:text-white transition-colors">All Listings</Link></li>
              <li><Link href="/dealers" className="hover:text-white transition-colors">Find a Dealer</Link></li>
              <li><Link href="/listings?condition=Excellent" className="hover:text-white transition-colors">Collector Cars</Link></li>
              <li><Link href="/cars/muscle-cars" className="hover:text-white transition-colors">Muscle Cars</Link></li>
              <li><Link href="/cars/srt" className="hover:text-white transition-colors">Dodge SRT</Link></li>
              <li><Link href="/cars/convertibles" className="hover:text-white transition-colors">Convertibles</Link></li>
              <li><Link href="/cars/pickup-trucks" className="hover:text-white transition-colors">Classic Trucks</Link></li>
              <li><Link href="/cars/coupes" className="hover:text-white transition-colors">Coupes</Link></li>
              <li><Link href="/reports" className="hover:text-white transition-colors">Market Report</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Sell</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/sell" className="hover:text-white transition-colors">Post a Listing</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing Guide</Link></li>
              <li><Link href="/sell" className="hover:text-white transition-colors">Seller Tips</Link></li>
              <li><Link href="/dealer/login" className="hover:text-white transition-colors">Dealer Accounts</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/feedback" className="hover:text-white transition-colors">Give Feedback</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/dmca" className="hover:text-white transition-colors">DMCA Policy</Link></li>
              <li><Link href="/affiliate-disclosure" className="hover:text-white transition-colors">Affiliate Disclosure</Link></li>
              <li><Link href="/advertiser/signup" className="hover:text-white transition-colors">Advertise With Us</Link></li>
              <li><Link href="/advertiser/login" className="hover:text-white transition-colors">Advertiser Login</Link></li>
              <li><a href="https://garage-cherries-shop.fourthwall.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Shop Merch</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
          <p>© {new Date().getFullYear()} GarageCherries. All rights reserved.</p>
          <p>The specialty marketplace built for enthusiast vehicles</p>
        </div>
      </div>
    </footer>
  );
}
