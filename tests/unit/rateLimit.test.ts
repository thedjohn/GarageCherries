import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';

function makeRequestWithHeaders(headers: Record<string, string>) {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

// Each test gets a fresh module so the in-memory store is reset
beforeEach(() => {
  vi.resetModules();
});

describe('rateLimit', () => {
  it('allows the first request', () => {
    const result = rateLimit('test:1.2.3.4', 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.firstBlock).toBe(false);
  });

  it('allows requests up to the max', () => {
    const key = 'test-max:1.2.3.4';
    for (let i = 0; i < 5; i++) {
      const r = rateLimit(key, 5, 60_000);
      expect(r.allowed).toBe(true);
    }
  });

  it('blocks the request that exceeds the max', () => {
    const key = 'test-block:1.2.3.4';
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000);
    const result = rateLimit(key, 5, 60_000);
    expect(result.allowed).toBe(false);
  });

  it('sets firstBlock=true only on the first blocked request', () => {
    const key = 'test-firstblock:1.2.3.4';
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 60_000);
    const first = rateLimit(key, 5, 60_000);
    const second = rateLimit(key, 5, 60_000);
    expect(first.firstBlock).toBe(true);
    expect(second.firstBlock).toBe(false);
  });

  it('resets the window after the window expires', () => {
    vi.useFakeTimers();
    const key = 'test-reset:1.2.3.4';
    for (let i = 0; i < 5; i++) rateLimit(key, 5, 1_000);
    expect(rateLimit(key, 5, 1_000).allowed).toBe(false);

    vi.advanceTimersByTime(1_001);
    expect(rateLimit(key, 5, 1_000).allowed).toBe(true);
    vi.useRealTimers();
  });

  it('tracks separate keys independently', () => {
    const key1 = 'test-sep:1.1.1.1';
    const key2 = 'test-sep:2.2.2.2';
    for (let i = 0; i < 5; i++) rateLimit(key1, 5, 60_000);
    expect(rateLimit(key1, 5, 60_000).allowed).toBe(false);
    expect(rateLimit(key2, 5, 60_000).allowed).toBe(true);
  });

  it('allows exactly max requests before blocking', () => {
    const key = 'test-exact:1.2.3.4';
    const max = 3;
    const results = Array.from({ length: max + 1 }, () => rateLimit(key, max, 60_000));
    expect(results.slice(0, max).every(r => r.allowed)).toBe(true);
    expect(results[max].allowed).toBe(false);
  });
});

describe('getClientIP', () => {
  it('prefers the first entry of x-forwarded-for', () => {
    const req = makeRequestWithHeaders({ 'x-forwarded-for': ' 9.9.9.9 , 1.1.1.1' });
    expect(getClientIP(req)).toBe('9.9.9.9');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = makeRequestWithHeaders({ 'x-real-ip': '8.8.8.8' });
    expect(getClientIP(req)).toBe('8.8.8.8');
  });

  it('falls back to "unknown" when neither header is present', () => {
    const req = makeRequestWithHeaders({});
    expect(getClientIP(req)).toBe('unknown');
  });
});
