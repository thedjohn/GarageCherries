'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';

function buildHref(basePath: string, params: URLSearchParams, page: number) {
  const p = new URLSearchParams(params);
  if (page <= 1) p.delete('page'); else p.set('page', String(page));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

// Compresses to first, last, current, and one neighbor on each side -- e.g.
// 1 ... 4 5 6 ... 12 -- rather than ever rendering every page number, so the
// bar stays a single fixed-height row no matter how many pages there are.
function pageItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const keep = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = [...keep].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const items: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push('ellipsis');
    items.push(p);
    prev = p;
  }
  return items;
}

// Dims a link's label while its navigation is in flight -- previously a tap
// gave zero visual feedback (no spinner, nothing) for up to ~2s on mobile,
// which read as "broken" and drove repeat taps on the same link (pagination
// was Clarity's #1 dead-click source on both /listings and /events).
function PendingAwareLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <span className={pending ? 'opacity-40' : undefined}>{children}</span>;
}

export default function Pagination({ currentPage, totalPages, basePath, searchParams }: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const params = new URLSearchParams();
  Object.entries(searchParams ?? {}).forEach(([k, v]) => { if (v && k !== 'page') params.set(k, v); });

  const items = pageItems(currentPage, totalPages);
  const pillClass = "text-sm font-semibold border border-zinc-200 rounded-lg px-3 py-1.5 min-w-[36px] text-center hover:border-zinc-400 transition-colors";
  // Deliberately has no border/pill shape -- a non-interactive indicator
  // (current page, disabled Previous/Next) that's styled like the real
  // buttons around it gets tapped anyway. Confirmed via Clarity: the
  // current-page indicator (previously a solid red pill, the same red used
  // for primary CTAs site-wide) accounted for ~32% of all dead taps on
  // /listings, and the disabled "Previous" pill -- which only differed from
  // a working button by faint gray text, since cursor:not-allowed has no
  // effect on a touchscreen -- added another chunk on top of that.
  const inertClass = "text-sm font-semibold px-3 py-1.5 min-w-[36px] text-center";

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between pt-6 mt-2 border-t border-zinc-100">
      {currentPage > 1 ? (
        <Link href={buildHref(basePath, params, currentPage - 1)} className={pillClass}>
          <PendingAwareLabel>← Previous</PendingAwareLabel>
        </Link>
      ) : (
        <span className={`${inertClass} text-zinc-300`} aria-disabled="true">← Previous</span>
      )}

      <div className="flex items-center gap-1">
        {items.map((it, i) => it === 'ellipsis' ? (
          <span key={`e${i}`} className="text-zinc-400 px-1 text-sm">…</span>
        ) : it === currentPage ? (
          <span key={it} aria-current="page" className={`${inertClass} text-red-600`}>{it}</span>
        ) : (
          <Link key={it} href={buildHref(basePath, params, it)} className={pillClass}>
            <PendingAwareLabel>{it}</PendingAwareLabel>
          </Link>
        ))}
      </div>

      {currentPage < totalPages ? (
        <Link href={buildHref(basePath, params, currentPage + 1)} className={pillClass}>
          <PendingAwareLabel>Next →</PendingAwareLabel>
        </Link>
      ) : (
        <span className={`${inertClass} text-zinc-300`} aria-disabled="true">Next →</span>
      )}
    </nav>
  );
}
