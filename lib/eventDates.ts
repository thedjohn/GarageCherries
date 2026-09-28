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

// The upcoming Friday-Sunday window, in whatever timezone `from` is
// constructed in -- callers pass a Date already anchored to the timezone
// they care about. Never returns today even if today is a Friday/Saturday/
// Sunday, matching the weekly alert email's "every Thursday, for the
// weekend ahead" framing rather than "this instant."
export function upcomingWeekendRange(from: Date): { fridayStr: string; sundayStr: string } {
  const day = from.getDay(); // 0 = Sun, 5 = Fri
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  const friday = new Date(from);
  friday.setDate(from.getDate() + daysUntilFriday);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  const toStr = (dt: Date) => dt.toISOString().slice(0, 10);
  return { fridayStr: toStr(friday), sundayStr: toStr(sunday) };
}

// An event overlaps the [friday, sunday] window if it starts on/before
// Sunday and ends (or, for single-day events, starts) on/after Friday.
export function applyThisWeekend<T>(q: T, fridayStr: string, sundayStr: string): T {
  return (q as any).lte('date', sundayStr).or(`end_date.gte.${fridayStr},and(end_date.is.null,date.gte.${fridayStr})`);
}
