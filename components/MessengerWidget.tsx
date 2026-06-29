'use client';
import { useEffect, useRef, useState } from 'react';
import { useMessenger } from '@/lib/messenger-context';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  reported: boolean;
  created_at: string;
}

export default function MessengerWidget() {
  const { open, minimized, conversationId, listingTitle, closeChat, toggleMinimize } = useMessenger();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [reported, setReported] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserName(user.user_metadata?.full_name || user.email || '');
      }
    });
  }, []);

  // Load messages when conversation opens
  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    fetch(`/api/conversations/${conversationId}/messages`)
      .then(r => r.json())
      .then(({ messages: msgs }) => setMessages(msgs ?? []));
    // Mark as read
    try {
      const existing: string[] = JSON.parse(localStorage.getItem('gc_read_convs') ?? '[]');
      if (!existing.includes(conversationId)) {
        localStorage.setItem('gc_read_convs', JSON.stringify([...existing, conversationId]));
        window.dispatchEvent(new CustomEvent('gc:conv-read', { detail: { convId: conversationId } }));
      }
    } catch {}
  }, [conversationId]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId || !userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`messenger:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, userId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, minimized]);

  // Focus input when opening
  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, minimized]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending || !conversationId) return;
    setSending(true);
    await fetch(`/api/conversations/${conversationId}/messages`, {
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

  if (!open || !conversationId) return null;

  return (
    <div className="fixed bottom-0 right-6 z-50 w-80 flex flex-col shadow-2xl rounded-t-2xl overflow-hidden"
      style={{ maxHeight: minimized ? 'auto' : '480px' }}>

      {/* Header */}
      <div className="bg-zinc-900 text-white px-4 py-3 flex items-center gap-2 cursor-pointer select-none"
        onClick={toggleMinimize}>
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shrink-0 text-sm">
          🚗
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{listingTitle}</p>
          <p className="text-xs text-zinc-400">Private Seller</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); toggleMinimize(); }}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            title={minimized ? 'Expand' : 'Minimize'}>
            {minimized ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
          <button
            onClick={e => { e.stopPropagation(); closeChat(); }}
            className="text-zinc-400 hover:text-white transition-colors p-1"
            title="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-zinc-50 p-3 space-y-2" style={{ height: '360px' }}>
            {messages.length === 0 && (
              <p className="text-center text-zinc-400 text-xs py-8">
                Start the conversation below.
              </p>
            )}
            {messages.map(msg => {
              const isMe = msg.sender_id === userId;
              const isReported = reported.has(msg.id) || msg.reported;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                  <div className={`max-w-[80%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-xs text-zinc-400 px-1">{msg.sender_name}</span>
                    )}
                    <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-red-600 text-white rounded-br-sm'
                        : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm'
                    }`}>
                      {isReported ? (
                        <span className="italic text-xs opacity-60">Message reported</span>
                      ) : msg.body}
                    </div>
                    <div className={`flex items-center gap-1.5 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
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
          <form onSubmit={sendMessage} className="flex gap-2 p-2 bg-white border-t border-zinc-200">
            <input
              ref={inputRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
