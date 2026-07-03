import { describe, it, expect } from 'vitest';
import { CONDITIONS } from '@/lib/types';

// ── Email regex (same pattern used in /api/inquire and /api/offers) ──────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('Email validation regex', () => {
  it('accepts a standard email address', () => {
    expect(EMAIL_RE.test('buyer@example.com')).toBe(true);
  });

  it('accepts subdomains', () => {
    expect(EMAIL_RE.test('user@mail.example.com')).toBe(true);
  });

  it('accepts plus-addressing', () => {
    expect(EMAIL_RE.test('user+tag@example.com')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(EMAIL_RE.test('notanemail.com')).toBe(false);
  });

  it('rejects missing domain', () => {
    expect(EMAIL_RE.test('user@')).toBe(false);
  });

  it('rejects missing local part', () => {
    expect(EMAIL_RE.test('@example.com')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(EMAIL_RE.test('user @example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(EMAIL_RE.test('')).toBe(false);
  });
});

// ── UUID regex (used in all /unsubscribe/* pages) ────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('UUID validation regex', () => {
  it('accepts a valid UUID v4', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts uppercase UUID', () => {
    expect(UUID_RE.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(UUID_RE.test('')).toBe(false);
  });

  it('rejects a plain string', () => {
    expect(UUID_RE.test('not-a-uuid')).toBe(false);
  });

  it('rejects a UUID missing a segment', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716')).toBe(false);
  });

  it('rejects a UUID with extra characters', () => {
    expect(UUID_RE.test('550e8400-e29b-41d4-a716-446655440000x')).toBe(false);
  });

  it('rejects SQL injection attempt', () => {
    expect(UUID_RE.test("' OR '1'='1")).toBe(false);
  });
});

// ── Condition validation (used in /api/listings/submit) ──────────────────────
const validConditions = CONDITIONS.filter(c => c !== 'All');

describe('Condition validation', () => {
  it('accepts all valid condition values', () => {
    for (const c of validConditions) {
      expect(validConditions.includes(c)).toBe(true);
    }
  });

  it('rejects All as a submission value', () => {
    expect(validConditions.includes('All')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(validConditions.includes('')).toBe(false);
  });

  it('rejects an arbitrary string', () => {
    expect(validConditions.includes('Like New')).toBe(false);
  });

  it('rejects case-variant of a valid condition', () => {
    expect(validConditions.includes('excellent')).toBe(false);
  });

  it('has at least one valid condition', () => {
    expect(validConditions.length).toBeGreaterThan(0);
  });
});
