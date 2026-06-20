'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AccountProfilePage() {
  const router = useRouter();
  const [email, setEmail]         = useState('');
  const [fullName, setFullName]   = useState('');
  const [phone, setPhone]         = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved]   = useState(false);
  const [profileError, setProfileError]   = useState('');

  const [currentPw, setCurrentPw]   = useState('');
  const [newPw, setNewPw]           = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwSaved, setPwSaved]       = useState(false);
  const [pwError, setPwError]       = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/account/login'); return; }
      setEmail(user.email ?? '');
    });
    fetch('/api/account/profile').then(r => r.json()).then(({ profile }) => {
      if (profile) { setFullName(profile.full_name ?? ''); setPhone(profile.phone ?? ''); }
    });
  }, [router]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSaving(true);
    const res = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: fullName, phone }),
    });
    setProfileSaving(false);
    if (!res.ok) { const j = await res.json(); setProfileError(j.error ?? 'Save failed'); return; }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setPwSaving(true);

    // Verify current password by re-authenticating
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPw });
    if (signInError) { setPwError('Current password is incorrect.'); setPwSaving(false); return; }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) { setPwError(error.message); return; }
    setPwSaved(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setTimeout(() => setPwSaved(false), 3000);
  };

  const inp = 'w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account/watchlist" className="text-sm text-zinc-400 hover:text-red-600 transition-colors">← Watchlist</Link>
        <span className="text-zinc-300">/</span>
        <h1 className="text-xl font-extrabold text-zinc-900">Account Settings</h1>
      </div>

      {/* Profile info */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6 mb-6">
        <h2 className="font-bold text-zinc-800 text-base mb-5">Personal Information</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Full Name</label>
            <input type="text" value={fullName} onChange={e => { setFullName(e.target.value); setProfileSaved(false); }}
              placeholder="Your name" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Phone <span className="font-normal normal-case text-zinc-400">(optional)</span></label>
            <input type="tel" value={phone} onChange={e => { setPhone(e.target.value); setProfileSaved(false); }}
              placeholder="(555) 000-0000" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Email <span className="font-normal normal-case text-zinc-400">(login — not editable)</span></label>
            <input type="email" value={email} readOnly className={`${inp} bg-zinc-50 text-zinc-400 cursor-not-allowed`} />
          </div>

          {profileError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{profileError}</p>}

          <div className="flex items-center gap-4">
            <button type="submit" disabled={profileSaving}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
              {profileSaving ? 'Saving…' : 'Save'}
            </button>
            {profileSaved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
        <h2 className="font-bold text-zinc-800 text-base mb-5">Change Password</h2>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Current Password</label>
            <input type="password" required value={currentPw} onChange={e => { setCurrentPw(e.target.value); setPwSaved(false); }}
              placeholder="••••••••" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">New Password</label>
            <input type="password" required value={newPw} onChange={e => { setNewPw(e.target.value); setPwSaved(false); }}
              placeholder="At least 6 characters" minLength={6} className={inp} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Confirm New Password</label>
            <input type="password" required value={confirmPw} onChange={e => { setConfirmPw(e.target.value); setPwSaved(false); }}
              placeholder="••••••••" className={inp} />
          </div>

          {pwError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{pwError}</p>}

          <div className="flex items-center gap-4">
            <button type="submit" disabled={pwSaving}
              className="bg-zinc-800 hover:bg-zinc-900 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
              {pwSaving ? 'Updating…' : 'Update Password'}
            </button>
            {pwSaved && <span className="text-sm text-green-600 font-medium">✓ Password updated</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
