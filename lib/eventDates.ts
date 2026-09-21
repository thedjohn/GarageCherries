// "Current" = hasn't ended yet. The cutoff is today's date in Pacific time, the
// westernmost continental US zone: an event dated D stays listed until the
// evening of D has ended even on the west coast (midnight Pacific = 2 AM Central,
// 3 AM Eastern the next morning), but nothing from yesterday lingers. A
// multi-day event stays until its end_date has passed.
export function eventsCutoff(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

export function isCurrentEvent(e: { date: string; end_date?: string | null }, cutoff: string): boolean {
  return e.date >= cutoff || (!!e.end_date && e.end_date >= cutoff);
}

// A multi-day event that has already started but hasn't ended yet -- distinct
// from "upcoming" (hasn't started) so it can get its own "Happening Now"
// section instead of showing a stale start-date badge in the upcoming list.
export function isHappeningNow(e: { date: string; end_date?: string | null }, cutoff: string): boolean {
  return e.date < cutoff && !!e.end_date && e.end_date >= cutoff;
}

// Query-builder helpers for Supabase/PostgREST (typed loosely, same as the
// applyFilters helpers in the events pages).
export function applyCurrentEvents<T>(q: T, cutoff: string): T {
  return (q as any).or(`date.gte.${cutoff},end_date.gte.${cutoff}`);
}

export function applyUpcomingEvents<T>(q: T, cutoff: string): T {
  return (q as any).gte('date', cutoff);
}

export function applyHappeningNow<T>(q: T, cutoff: string): T {
  return (q as any).lt('date', cutoff).gte('end_date', cutoff);
}

export function applyPastEvents<T>(q: T, cutoff: string): T {
  return (q as any).lt('date', cutoff).or(`end_date.is.null,end_date.lt.${cutoff}`);
}
