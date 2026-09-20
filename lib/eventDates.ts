// "Current" = hasn't ended yet. The cutoff is yesterday (UTC), not today, so an
// evening event doesn't vanish early when UTC has already rolled to the next
// day, and a multi-day event stays listed until its end_date has passed.
export function eventsCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function isCurrentEvent(e: { date: string; end_date?: string | null }, cutoff: string): boolean {
  return e.date >= cutoff || (!!e.end_date && e.end_date >= cutoff);
}

// Query-builder helpers for Supabase/PostgREST (typed loosely, same as the
// applyFilters helpers in the events pages).
export function applyCurrentEvents<T>(q: T, cutoff: string): T {
  return (q as any).or(`date.gte.${cutoff},end_date.gte.${cutoff}`);
}

export function applyPastEvents<T>(q: T, cutoff: string): T {
  return (q as any).lt('date', cutoff).or(`end_date.is.null,end_date.lt.${cutoff}`);
}
