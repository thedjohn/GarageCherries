import Link from 'next/link';

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

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between pt-6 mt-2 border-t border-zinc-100">
      {currentPage > 1 ? (
        <Link href={buildHref(basePath, params, currentPage - 1)} className={pillClass}>← Previous</Link>
      ) : (
        <span className={`${pillClass} text-zinc-300 cursor-not-allowed`}>← Previous</span>
      )}

      <div className="flex items-center gap-1">
        {items.map((it, i) => it === 'ellipsis' ? (
          <span key={`e${i}`} className="text-zinc-400 px-1 text-sm">…</span>
        ) : it === currentPage ? (
          <span key={it} aria-current="page" className="text-sm font-semibold bg-red-600 text-white rounded-lg px-3 py-1.5 min-w-[36px] text-center">{it}</span>
        ) : (
          <Link key={it} href={buildHref(basePath, params, it)} className={pillClass}>{it}</Link>
        ))}
      </div>

      {currentPage < totalPages ? (
        <Link href={buildHref(basePath, params, currentPage + 1)} className={pillClass}>Next →</Link>
      ) : (
        <span className={`${pillClass} text-zinc-300 cursor-not-allowed`}>Next →</span>
      )}
    </nav>
  );
}
