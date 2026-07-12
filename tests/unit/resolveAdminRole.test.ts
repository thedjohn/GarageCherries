import { describe, it, expect } from 'vitest';
import { resolveAdminRole, type TeamMember } from '@/lib/resolveAdminRole';

const team: TeamMember[] = [
  { user_id: 'u-1', email: 'super@x.com', role: 'superadmin', created_at: '2026-01-01' },
  { user_id: 'u-2', email: 'admin@x.com', role: 'admin', created_at: '2026-01-01' },
  { user_id: 'u-3', email: 'mod@x.com', role: 'moderator', created_at: '2026-01-01' },
  { user_id: 'u-4', email: 'support@x.com', role: 'support', created_at: '2026-01-01' },
];

describe('resolveAdminRole', () => {
  it('returns superadmin for the matching team member', () => {
    expect(resolveAdminRole(team, 'super@x.com')).toBe('superadmin');
  });

  it.each(['admin@x.com', 'mod@x.com', 'support@x.com'])(
    'returns the non-superadmin role for %s, not superadmin',
    (email) => {
      const role = resolveAdminRole(team, email);
      expect(role).not.toBeNull();
      expect(role).not.toBe('superadmin');
    }
  );

  it('returns null when the email has no matching team member', () => {
    expect(resolveAdminRole(team, 'nobody@x.com')).toBeNull();
  });

  it('returns null when email is null', () => {
    expect(resolveAdminRole(team, null)).toBeNull();
  });

  it('returns null when email is undefined', () => {
    expect(resolveAdminRole(team, undefined)).toBeNull();
  });

  it('returns null for an empty team list', () => {
    expect(resolveAdminRole([], 'super@x.com')).toBeNull();
  });
});
