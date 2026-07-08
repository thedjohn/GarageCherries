'use client';

import { useState } from 'react';

export default function Tooltip({
  text,
  align = 'center',
  side = 'top',
}: {
  text: string;
  align?: 'left' | 'center' | 'right';
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);

  const bubblePos =
    align === 'right' ? 'right-0' :
    align === 'left'  ? 'left-0' :
    'left-1/2 -translate-x-1/2';

  const arrowPos =
    align === 'right' ? 'right-2' :
    align === 'left'  ? 'left-2' :
    'left-1/2 -translate-x-1/2';

  const bubbleVertical = side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2';
  const arrowVertical  = side === 'bottom'
    ? 'bottom-full border-b-zinc-900'
    : 'top-full border-t-zinc-900';

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
        <span className={`absolute w-56 bg-zinc-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-50 pointer-events-none leading-relaxed ${bubbleVertical} ${bubblePos}`}>
          {text}
          <span className={`absolute border-4 border-transparent ${arrowVertical} ${arrowPos}`} />
        </span>
      )}
    </span>
  );
}
