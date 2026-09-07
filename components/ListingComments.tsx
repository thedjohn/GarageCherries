'use client';
import { useState } from 'react';

interface Comment {
  id: string;
  author_id: string;
  author_name: string;
  is_seller: boolean;
  body: string;
  parent_id: string | null;
  reported?: boolean;
  created_at: string;
}

interface Props {
  listingId: string;
  isLoggedIn: boolean;
  userId: string | null;
  canModerate: boolean;
  sellerName: string;
  initialComments: Comment[];
}

export default function ListingComments({ listingId, isLoggedIn, userId, canModerate, sellerName, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const topLevel = comments.filter(c => !c.parent_id);
  const repliesByParent = new Map<string, Comment>();
  for (const c of comments) {
    if (c.parent_id) repliesByParent.set(c.parent_id, c);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    setError('');
    setSubmitting(true);
    const res = await fetch(`/api/listings/${listingId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, authorName: name }),
    });
    setSubmitting(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setComments(prev => [...prev, data.comment]);
      setBody('');
      setShowForm(false);
    } else {
      setError(data.error ?? 'Failed to post comment.');
    }
  }

  async function handleReply(parentId: string) {
    if (!replyBody.trim()) return;
    setReplySubmitting(true);
    const res = await fetch(`/api/listings/${listingId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: replyBody, parentId, authorName: sellerName }),
    });
    setReplySubmitting(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setComments(prev => [...prev, data.comment]);
      setReplyBody('');
      setReplyingTo(null);
    }
  }

  async function handleReport(commentId: string) {
    await fetch(`/api/listings/${listingId}/comments/${commentId}/report`, { method: 'PATCH' });
    setReported(prev => new Set(prev).add(commentId));
  }

  async function handleDelete(commentId: string) {
    const res = await fetch(`/api/listings/${listingId}/comments/${commentId}`, { method: 'DELETE' });
    if (res.ok) setComments(prev => prev.filter(c => c.id !== commentId && c.parent_id !== commentId));
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-zinc-900">Questions &amp; Comments</h2>
        {isLoggedIn && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
          >
            Ask a Question
          </button>
        )}
      </div>

      {!isLoggedIn && (
        <p className="text-sm text-zinc-500 mb-4">Sign in to ask a question about this vehicle.</p>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 mb-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Your Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="Display name (shown publicly)"
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Your Question</label>
            <textarea required rows={3} value={body} onChange={e => setBody(e.target.value)}
              placeholder="Ask something about this vehicle..."
              className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
              {submitting ? 'Posting…' : 'Post Question'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 border border-zinc-200 text-zinc-600 font-semibold rounded-xl text-sm hover:bg-zinc-50 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {topLevel.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-8 text-center">
          <p className="text-zinc-500 text-sm">No questions yet. Be the first to ask.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topLevel.map(c => {
            const reply = repliesByParent.get(c.id);
            const isReported = reported.has(c.id) || c.reported;
            const canDelete = canModerate || c.author_id === userId;
            return (
              <div key={c.id} className="border border-zinc-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 group">
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">{c.author_name}</p>
                    <p className="text-xs text-zinc-400">{new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isReported && (
                      <button onClick={() => handleReport(c.id)} className="text-xs text-zinc-300 hover:text-red-500">Report</button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(c.id)} className="text-xs text-zinc-300 hover:text-red-500">Delete</button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
                  {isReported ? <span className="italic text-zinc-400">Comment reported</span> : c.body}
                </p>

                {reply && (
                  <div className="mt-3 ml-4 pl-4 border-l-2 border-red-200 bg-red-50/50 rounded-r-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Seller</span>
                      <span className="text-xs text-zinc-400">{new Date(reply.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <p className="text-sm text-zinc-700 leading-relaxed">{reply.body}</p>
                  </div>
                )}

                {canModerate && !reply && (
                  replyingTo === c.id ? (
                    <div className="mt-3 ml-4">
                      <textarea rows={2} value={replyBody} onChange={e => setReplyBody(e.target.value)}
                        placeholder="Write your reply..."
                        className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-2" />
                      <div className="flex gap-2">
                        <button onClick={() => handleReply(c.id)} disabled={replySubmitting}
                          className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-colors">
                          {replySubmitting ? 'Sending…' : 'Send Reply'}
                        </button>
                        <button onClick={() => { setReplyingTo(null); setReplyBody(''); }}
                          className="text-xs text-zinc-500 hover:text-zinc-700 px-2">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReplyingTo(c.id)} className="mt-2 text-xs font-semibold text-red-600 hover:underline">
                      Reply →
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
