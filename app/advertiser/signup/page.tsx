'use client';
import Image from 'next/image';
import { useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { STATES } from '@/lib/types';
import Turnstile from '@/components/Turnstile';

const TIERS = [
  { id: 'starter',   label: 'Starter',   price: '$79/mo',  radius: '15-mile radius' },
  { id: 'metro',     label: 'Metro',      price: '$139/mo', radius: '30-mile radius' },
  { id: 'regional',  label: 'Regional',   price: '$219/mo', radius: '60-mile radius' },
  { id: 'statewide', label: 'Statewide',  price: '$349/mo', radius: 'Entire state' },
];

const CATEGORIES = [
  { id: 'detail',      label: 'Auto Detailing' },
  { id: 'insurance',   label: 'Classic Car Insurance' },
  { id: 'finance',     label: 'Financing / Lending' },
  { id: 'transport',   label: 'Transport & Shipping' },
  { id: 'storage',     label: 'Storage' },
  { id: 'restoration', label: 'Restoration' },
  { id: 'inspection',  label: 'Pre-Purchase Inspection' },
  { id: 'other',       label: 'Other' },
];

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTier = searchParams.get('tier') ?? 'metro';

  const [form, setForm] = useState({
    businessName: '', contactName: '', email: '', password: '', phone: '',
    address: '', city: '', state: '', zip: '',
    category: 'detail', tier: defaultTier,
  });
  const [cfToken, setCfToken] = useState('');
  const onCaptchaVerify = useCallback((token: string) => setCfToken(token), []);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/advertiser/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email, password: form.password,
        businessName: form.businessName, contactName: form.contactName,
        phone: form.phone, address: form.address, city: form.city,
        state: form.state, zip: form.zip,
        category: form.category, tier: form.tier,
        cfToken,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Signup failed');
      setLoading(false);
      return;
    }

    // Sign in
    const supabase = createClient();
    await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    router.push('/advertiser/dashboard?welcome=1');
    router.refresh();
  };

  const input = (label: string, key: string, type = 'text', placeholder = '') => (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type={type} required={['businessName','email','password'].includes(key)}
        value={(form as any)[key]} onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image src="https://comiuxnpvngcrvtgzpae.supabase.co/storage/v1/object/public/listing-images/branding/cherries.png" alt="GarageCherries" width={32} height={32} unoptimized />
            <span className="text-xl font-bold">Garage<span className="text-red-600">Cherries</span></span>
          </Link>
          <p className="text-zinc-500 text-sm mt-2">Create your advertiser account · 14-day free trial</p>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-8">
          <h1 className="text-xl font-bold text-zinc-900 mb-6">Get started</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {input('Business Name', 'businessName', 'text', 'AutoShine Detailing')}
              {input('Contact Name', 'contactName', 'text', 'Jane Smith')}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {input('Email', 'email', 'email', 'you@business.com')}
              {input('Phone', 'phone', 'tel', '(312) 555-0100')}
            </div>

            {input('Password', 'password', 'password', 'Min 8 characters')}

            <div className="grid grid-cols-2 gap-4">
              {input('City', 'city', 'text', 'Chicago')}
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">State</label>
                <select
                  value={form.state} onChange={e => set('state', e.target.value)} required
                  className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select state</option>
                  {STATES.filter(s => s !== 'All States').map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Business Category</label>
              <select
                value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Plan</label>
              <div className="grid grid-cols-2 gap-2">
                {TIERS.map(t => (
                  <label key={t.id} className={`cursor-pointer border-2 rounded-xl p-3 transition-colors ${form.tier === t.id ? 'border-red-600 bg-red-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                    <input type="radio" name="tier" value={t.id} checked={form.tier === t.id} onChange={() => set('tier', t.id)} className="sr-only" />
                    <p className="font-bold text-sm text-zinc-900">{t.label}</p>
                    <p className="text-xs text-red-600 font-semibold">{t.price}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{t.radius}</p>
                  </label>
                ))}
              </div>
              <p className="text-xs text-zinc-400 mt-2">14-day free trial, then billed monthly. Cancel anytime.</p>
            </div>

            <Turnstile onVerify={onCaptchaVerify} />

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit" disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {loading ? 'Creating account…' : 'Start free trial'}
            </button>
          </form>

          <p className="text-xs text-zinc-400 text-center mt-6">
            Already have an account?{' '}
            <Link href="/advertiser/login" className="text-red-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdvertiserSignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}
