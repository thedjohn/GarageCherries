'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const EVENT_TYPES = ['show', 'swap-meet', 'cruise', 'auction'] as const;
const TYPE_LABELS: Record<string, string> = {
  'show': 'Car Show', 'swap-meet': 'Swap Meet', 'cruise': 'Cruise Night', 'auction': 'Auction',
};

const BLANK = { name: '', date: '', end_date: '', start_time: '', end_time: '', location: '', state: '', type: 'show', description: '', url: '' };

export default function SubmitEventForm() {
  const [user, setUser] = useState<{ email: string } | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Lazy-load auth state on first render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user ?? null as any));
  }, []);

  // Not yet loaded
  if (user === undefined) return null;

  // Not logged in
  if (!user) {
    return (
      <div className="mt-12 bg-zinc-50 border border-zinc-200 rounded-2xl p-8 text-center">
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Know of an event we missed?</h2>
        <p className="text-sm text-zinc-500 mb-4">Sign in to submit an event for the community calendar.</p>
        <a href="/account" className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
          Sign In to Submit
        </a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mt-12 bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <p className="text-2xl mb-3">✅</p>
        <h2 className="text-lg font-bold text-zinc-900 mb-2">Event submitted!</h2>
        <p className="text-sm text-zinc-500 mb-4">Our team will review it and add it to the calendar shortly.</p>
        <button onClick={() => { setSuccess(false); setForm(BLANK); setOpen(false); }}
          className="text-sm font-semibold text-red-600 hover:underline">Submit another</button>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true); setError('');
    const res = await fetch('/api/events/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setWorking(false);
    if (!res.ok) { setError(json.error ?? 'Failed to submit. Please try again.'); return; }
    setSuccess(true);
  }

  const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-red-500';
  const labelCls = 'block text-xs font-semibold text-zinc-500 mb-1';

  return (
    <div className="mt-12 bg-zinc-50 border border-zinc-200 rounded-2xl p-8">
      <h2 className="text-lg font-bold text-zinc-900 mb-1">Know of an event we missed?</h2>
      <p className="text-sm text-zinc-500 mb-4">Submit it for review and we&apos;ll add it to the calendar.</p>

      {!open ? (
        <button onClick={() => setOpen(true)}
          className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors">
          Submit an Event
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={labelCls}>Event Name *</label>
            <input className={inputCls} required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Muscle Car &amp; Corvette Nationals" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type *</label>
              <select className={inputCls} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>State *</label>
              <input className={inputCls} required maxLength={2} value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value.toUpperCase() }))} placeholder="IL" />
            </div>
            <div>
              <label className={labelCls}>Start Date *</label>
              <input type="date" className={inputCls} required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>End Date (optional)</label>
              <input type="date" className={inputCls} value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Start Time (optional)</label>
              <input type="time" className={inputCls} value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>End Time (optional)</label>
              <input type="time" className={inputCls} value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className={labelCls}>City / Venue *</label>
            <input className={inputCls} required value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Springfield" />
          </div>
          <div>
            <label className={labelCls}>Description *</label>
            <textarea className={inputCls} required rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the event…" />
          </div>
          <div>
            <label className={labelCls}>Website URL (optional)</label>
            <input className={inputCls} type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={working}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors">
              {working ? 'Submitting…' : 'Submit for Review'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setError(''); setForm(BLANK); }}
              className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
