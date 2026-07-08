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
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Browse</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/listings" className="hover:text-white transition-colors">All Listings</Link></li>
              <li><Link href="/dealers" className="hover:text-white transition-colors">Find a Dealer</Link></li>
              <li><Link href="/listings?condition=Excellent" className="hover:text-white transition-colors">Collector Cars</Link></li>
              <li><Link href="/listings?bodyStyle=Convertible" className="hover:text-white transition-colors">Convertibles</Link></li>
              <li><Link href="/listings?bodyStyle=Pickup+Truck" className="hover:text-white transition-colors">Classic Trucks</Link></li>
              <li><Link href="/listings?bodyStyle=Coupe" className="hover:text-white transition-colors">Coupes</Link></li>
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
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link href="/advertiser/signup" className="hover:text-white transition-colors">Advertise With Us</Link></li>
              <li><Link href="/advertiser/login" className="hover:text-white transition-colors">Advertiser Login</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
          <p>© {new Date().getFullYear()} GarageCherries. All rights reserved.</p>
          <p>The #1 specialty car marketplace</p>
        </div>
      </div>
    </footer>
  );
}
