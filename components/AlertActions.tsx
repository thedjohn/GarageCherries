'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  id: string;
  paused: boolean;
}

export default function AlertActions({ id, paused: initialPaused }: Props) {
  const router = useRouter();
  const [paused, setPaused] = useState(initialPaused);
  const [deleting, setDeleting] = useState(false);

  const togglePause = async () => {
    const next = !paused;
    setPaused(next);
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, paused: next }),
    });
    router.refresh();
  };

  const del = async () => {
    if (!confirm('Delete this alert?')) return;
    setDeleting(true);
    await fetch(`/api/alerts?id=${id}`, { method: 'DELETE' });
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={togglePause}
        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 border border-zinc-200 hover:border-zinc-300 rounded-lg px-3 py-1.5 transition-colors"
      >
        {paused ? 'Resume' : 'Pause'}
      </button>
      <button
        onClick={del}
        disabled={deleting}
        className="text-xs font-semibold text-zinc-400 hover:text-red-600 border border-zinc-200 hover:border-red-200 rounded-lg px-2 py-1.5 transition-colors"
      >
        {deleting ? '…' : '✕'}
      </button>
    </div>
  );
}
