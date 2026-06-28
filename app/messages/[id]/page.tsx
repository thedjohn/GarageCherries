'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AccountTabBar from '@/components/AccountTabBar';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  reported: boolean;
  created_at: string;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [listingTitle, setListingTitle] = useState('');
  const [listingId, setListingId] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push(`/account/login?return=/messages/${id}`); return; }
      setUserId(user.id);
      setUserName(user.user_metadata?.full_name || user.email || '');

      // Load conversation info
      const { data: conv } = await supabase
        .from('conversations')
        .select('listing_title, listing_id')
        .eq('id', id)
        .single();
      if (conv) { setListingTitle(conv.listing_title); setListingId(conv.listing_id); }

      // Load messages
      const res = await fetch(`/api/conversations/${id}/messages`);
      const json = await res.json();
      setMessages(json.messages ?? []);
      setLoading(false);
    });
  }, [id, router]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${id}`,
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    setSending(true);
    await fetch(`/api/conversations/${id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, senderName: userName }),
    });
    setBody('');
    setSending(false);
  }

  async function reportMessage(msgId: string) {
    await fetch(`/api/messages/${msgId}/report`, { method: 'PATCH' });
    setReported(prev => new Set(prev).add(msgId));
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-zinc-400">Loading…</div>
  );

  return (
    <>
      <AccountTabBar />
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-160px)]">
        {/* Conversation header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-zinc-100">
          <Link href="/account?tab=messages" className="text-zinc-400 hover:text-zinc-700 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-zinc-900 truncate">{listingTitle || 'Conversation'}</h1>
          </div>
        </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <p className="text-center text-zinc-400 text-sm py-8">No messages yet. Start the conversation below.</p>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === userId;
          const isReported = reported.has(msg.id) || msg.reported;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
              <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                {!isMe && (
                  <span className="text-xs text-zinc-400 px-1">{msg.sender_name}</span>
                )}
                <div className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-red-600 text-white rounded-br-sm'
                    : 'bg-white border border-zinc-100 text-zinc-800 rounded-bl-sm shadow-sm'
                }`}>
                  {isReported ? (
                    <span className="italic text-zinc-400 text-xs">Message reported</span>
                  ) : (
                    msg.body
                  )}
                </div>
                <div className={`flex items-center gap-2 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-zinc-300">
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  {!isMe && !isReported && (
                    <button
                      onClick={() => reportMessage(msg.id)}
                      className="text-xs text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="flex gap-2 pt-3 border-t border-zinc-100">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
            Send
          </button>
        </form>
      </div>
    </>
  );
}
