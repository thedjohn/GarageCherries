'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Conversation {
  id: string;
  listing_id: string;
  listing_title: string;
  seller_email: string;
  last_message_at: string;
  created_at: string;
}

export default function MessagesInbox() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setAuthed(true);
      fetch('/api/conversations')
        .then(r => r.json())
        .then(({ conversations }) => setConvs(conversations ?? []))
        .finally(() => setLoading(false));
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-zinc-400">Loading…</div>
  );

  if (!authed) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <p className="text-4xl mb-4">💬</p>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Sign in to view messages</h1>
      <p className="text-zinc-500 mb-6">You need an account to send and receive messages.</p>
      <Link href="/account/login?return=/messages"
        className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-8 py-3 rounded-xl transition-colors">
        Sign In
      </Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-extrabold text-zinc-900 mb-6">Messages</h1>

      {convs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center">
          <p className="text-4xl mb-4">💬</p>
          <h3 className="text-xl font-bold text-zinc-800 mb-2">No messages yet</h3>
          <p className="text-zinc-500">When you message a seller about a listing, the conversation will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {convs.map(c => (
            <Link key={c.id} href={`/messages/${c.id}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 hover:border-red-200 hover:shadow-md transition-all group">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600 font-bold text-lg">
                🚗
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900 truncate group-hover:text-red-600 transition-colors">
                  {c.listing_title}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {new Date(c.last_message_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <svg className="w-4 h-4 text-zinc-300 group-hover:text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
