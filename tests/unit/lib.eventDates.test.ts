import { describe, it, expect, vi } from 'vitest';
import { eventsCutoff, isCurrentEvent, isHappeningNow, applyCurrentEvents, applyUpcomingEvents, applyHappeningNow, applyPastEvents } from '@/lib/eventDates';

describe('eventsCutoff (today in Pacific time)', () => {
  it('is today once the Pacific day has started', () => {
    // 14:00 UTC = 7 AM PDT on Sep 21, so yesterday's (Sep 20) events are gone
    expect(eventsCutoff(new Date('2026-09-21T14:00:00Z'))).toBe('2026-09-21');
  });

  it('is still the previous day late in the evening Pacific, so a west-coast evening show stays listed', () => {
    // 06:00 UTC on Sep 21 = 11 PM PDT on Sep 20
    expect(eventsCutoff(new Date('2026-09-21T06:00:00Z'))).toBe('2026-09-20');
  });

  it('flips at midnight Pacific in daylight time (07:00 UTC)', () => {
    expect(eventsCutoff(new Date('2026-09-21T06:59:00Z'))).toBe('2026-09-20');
    expect(eventsCutoff(new Date('2026-09-21T07:00:00Z'))).toBe('2026-09-21');
  });

  it('flips at midnight Pacific in standard time (08:00 UTC)', () => {
    expect(eventsCutoff(new Date('2027-01-15T07:59:00Z'))).toBe('2027-01-14');
    expect(eventsCutoff(new Date('2027-01-15T08:00:00Z'))).toBe('2027-01-15');
  });
});

describe('isCurrentEvent', () => {
  const cutoff = '2026-09-19';

  it('keeps an event on or after the cutoff', () => {
    expect(isCurrentEvent({ date: '2026-09-19' }, cutoff)).toBe(true);
    expect(isCurrentEvent({ date: '2026-10-24' }, cutoff)).toBe(true);
  });

  it('drops a single-day event before the cutoff', () => {
    expect(isCurrentEvent({ date: '2026-09-18' }, cutoff)).toBe(false);
    expect(isCurrentEvent({ date: '2026-09-18', end_date: null }, cutoff)).toBe(false);
  });

  it('keeps a multi-day event that started earlier but has not ended', () => {
    expect(isCurrentEvent({ date: '2026-09-17', end_date: '2026-09-20' }, cutoff)).toBe(true);
  });

  it('drops a multi-day event whose end date has also passed', () => {
    expect(isCurrentEvent({ date: '2026-09-10', end_date: '2026-09-12' }, cutoff)).toBe(false);
  });
});

describe('isHappeningNow', () => {
  const cutoff = '2026-09-19';

  it('is true for a multi-day event that started earlier but has not ended', () => {
    expect(isHappeningNow({ date: '2026-09-17', end_date: '2026-09-20' }, cutoff)).toBe(true);
  });

  it('is false for an event that has not started yet', () => {
    expect(isHappeningNow({ date: '2026-09-19', end_date: '2026-09-20' }, cutoff)).toBe(false);
  });

  it('is false for a single-day event with no end_date', () => {
    expect(isHappeningNow({ date: '2026-09-17' }, cutoff)).toBe(false);
  });

  it('is false once the end_date has also passed', () => {
    expect(isHappeningNow({ date: '2026-09-10', end_date: '2026-09-18' }, cutoff)).toBe(false);
  });
});

describe('query helpers', () => {
  it('applyCurrentEvents keeps events starting or ending on/after the cutoff', () => {
    const q = { or: vi.fn().mockReturnThis() };
    applyCurrentEvents(q, '2026-09-19');
    expect(q.or).toHaveBeenCalledWith('date.gte.2026-09-19,end_date.gte.2026-09-19');
  });

  it('applyUpcomingEvents keeps only events that have not started yet', () => {
    const q = { gte: vi.fn().mockReturnThis() };
    applyUpcomingEvents(q, '2026-09-19');
    expect(q.gte).toHaveBeenCalledWith('date', '2026-09-19');
  });

  it('applyHappeningNow keeps only events that started earlier but have not ended', () => {
    const q = { lt: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis() };
    applyHappeningNow(q, '2026-09-19');
    expect(q.lt).toHaveBeenCalledWith('date', '2026-09-19');
    expect(q.gte).toHaveBeenCalledWith('end_date', '2026-09-19');
  });

  it('applyPastEvents keeps only events that started and ended before the cutoff', () => {
    const q = { lt: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis() };
    applyPastEvents(q, '2026-09-19');
    expect(q.lt).toHaveBeenCalledWith('date', '2026-09-19');
    expect(q.or).toHaveBeenCalledWith('end_date.is.null,end_date.lt.2026-09-19');
  });
});
