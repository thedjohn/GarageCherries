import { describe, it, expect, vi } from 'vitest';
import { eventsCutoff, isCurrentEvent, applyCurrentEvents, applyPastEvents } from '@/lib/eventDates';

describe('eventsCutoff', () => {
  it('is yesterday in UTC', () => {
    expect(eventsCutoff(new Date('2026-09-20T15:00:00Z'))).toBe('2026-09-19');
  });

  it('rolls back across a month boundary', () => {
    expect(eventsCutoff(new Date('2026-10-01T02:00:00Z'))).toBe('2026-09-30');
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

describe('query helpers', () => {
  it('applyCurrentEvents keeps events starting or ending on/after the cutoff', () => {
    const q = { or: vi.fn().mockReturnThis() };
    applyCurrentEvents(q, '2026-09-19');
    expect(q.or).toHaveBeenCalledWith('date.gte.2026-09-19,end_date.gte.2026-09-19');
  });

  it('applyPastEvents keeps only events that started and ended before the cutoff', () => {
    const q = { lt: vi.fn().mockReturnThis(), or: vi.fn().mockReturnThis() };
    applyPastEvents(q, '2026-09-19');
    expect(q.lt).toHaveBeenCalledWith('date', '2026-09-19');
    expect(q.or).toHaveBeenCalledWith('end_date.is.null,end_date.lt.2026-09-19');
  });
});
