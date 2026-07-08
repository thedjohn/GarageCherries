'use client';

import { useState } from 'react';

export default function Tooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        aria-label="More information"
        className="w-3.5 h-3.5 rounded-full bg-zinc-200 text-zinc-500 hover:bg-zinc-300 text-[9px] font-bold leading-none flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400"
      >
        i
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 pointer-events-none leading-relaxed">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
        </span>
      )}
    </span>
  );
}
