'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function DealerApplyPage() {
  const [fields, setFields] = useState({
    name: '', email: '', phone: '',
    dealerName: '', address: '', location: '', state: '', zip: '',
    website: '', specialties: '', description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));
  const inp = 'w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    const res = await fetch('/api/dealer/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    setSubmitting(false);
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? 'Something went wrong. Please try again.'); return; }
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">🍒</div>
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-3">Application Received</h1>
        <p className="text-zinc-500 text-sm mb-6">
          Thanks for applying to list on GarageCherries. We review all dealer applications manually
          and will reach out to <strong>{fields.email}</strong> within 2–3 business days.
        </p>
        <Link href="/" className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
          Back to home
        </Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center gap-2 mb-6">
          <span className="text-xl">🍒</span>
          <span className="font-bold text-lg">Garage<span className="text-red-600">Cherries</span></span>
        </Link>
        <h1 className="text-2xl font-extrabold text-zinc-900 mb-2">Dealer Account Application</h1>
        <p className="text-zinc-500 text-sm">
          Fill out the form below and our team will review your application. Approved dealers get
          a full dashboard to manage inventory, view inquiries, and track performance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8 space-y-6">

        {/* Contact info */}
        <div>
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-4">Contact Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Your Name *</label>
              <input type="text" required value={fields.name} onChange={e => set('name', e.target.value)} placeholder="Full name" className={inp} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email Address *</label>
              <input type="email" required value={fields.email} onChange={e => set('email', e.target.value)} placeholder="Email address" className={inp} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Phone *</label>
              <input type="tel" required value={fields.phone} onChange={e => set('phone', e.target.value)} placeholder="Phone number" className={inp} />
            </div>
          </div>
        </div>

        {/* Dealership info */}
        <div>
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-4">Dealership Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Dealership Name *</label>
              <input type="text" required value={fields.dealerName} onChange={e => set('dealerName', e.target.value)} placeholder="Dealership name" className={inp} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Street Address</label>
              <input type="text" value={fields.address} onChange={e => set('address', e.target.value)} placeholder="Street address" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">City *</label>
              <input type="text" required value={fields.location} onChange={e => set('location', e.target.value)} placeholder="City" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">State *</label>
              <input type="text" required maxLength={2} value={fields.state} onChange={e => set('state', e.target.value.toUpperCase())} placeholder="State" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">ZIP Code</label>
              <input type="text" maxLength={10} value={fields.zip} onChange={e => set('zip', e.target.value)} placeholder="ZIP code" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Website</label>
              <input type="url" value={fields.website} onChange={e => set('website', e.target.value)} placeholder="https://" className={inp} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Specialties <span className="font-normal normal-case text-zinc-400">(comma separated)</span></label>
              <input type="text" value={fields.specialties} onChange={e => set('specialties', e.target.value)} placeholder="e.g. Classic Cars, Muscle Cars, Trucks" className={inp} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">About Your Dealership *</label>
              <textarea required rows={5} value={fields.description} onChange={e => set('description', e.target.value)}
                placeholder="Tell us about your dealership — years in business, what you specialize in, approximate inventory size..."
                className="w-full border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors">
          {submitting ? 'Submitting…' : 'Submit Application'}
        </button>

        <p className="text-xs text-zinc-400 text-center">
          Already have an account?{' '}
          <Link href="/dealer/login" className="text-red-600 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
