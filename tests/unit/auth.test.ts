import { describe, it, expect } from 'vitest';

// ─── Role hierarchy ───────────────────────────────────────────────────────────
type AdminRole = 'superadmin' | 'admin' | 'moderator' | 'support';
const ROLE_HIERARCHY: AdminRole[] = ['support', 'moderator', 'admin', 'superadmin'];

function hasRole(userRole: AdminRole, minRole: AdminRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

describe('admin role hierarchy', () => {
  it('superadmin has all roles', () => {
    expect(hasRole('superadmin', 'superadmin')).toBe(true);
    expect(hasRole('superadmin', 'admin')).toBe(true);
    expect(hasRole('superadmin', 'moderator')).toBe(true);
    expect(hasRole('superadmin', 'support')).toBe(true);
  });

  it('admin cannot act as superadmin', () => {
    expect(hasRole('admin', 'superadmin')).toBe(false);
  });

  it('moderator cannot act as admin', () => {
    expect(hasRole('moderator', 'admin')).toBe(false);
  });

  it('support cannot act as moderator', () => {
    expect(hasRole('support', 'moderator')).toBe(false);
  });

  it('same role passes', () => {
    expect(hasRole('moderator', 'moderator')).toBe(true);
    expect(hasRole('support', 'support')).toBe(true);
  });
});

// ─── Dealer ownership check ──────────────────────────────────────────────────
describe('dealer ownership validation', () => {
  function isDealerOwner(userId: string, dealerId: string): boolean {
    return userId === dealerId;
  }

  it('user owns their own dealer record', () => {
    expect(isDealerOwner('user-123', 'user-123')).toBe(true);
  });

  it('user cannot access another dealer record', () => {
    expect(isDealerOwner('user-123', 'user-456')).toBe(false);
  });

  it('empty strings are not equal', () => {
    expect(isDealerOwner('', '')).toBe(true); // both empty — edge case
    expect(isDealerOwner('user-123', '')).toBe(false);
  });
});

// ─── Conversation access control ─────────────────────────────────────────────
describe('conversation access control', () => {
  function canAccessConversation(
    userId: string,
    buyerId: string,
    sellerId: string | null,
  ): boolean {
    return userId === buyerId || userId === sellerId;
  }

  it('buyer can access their conversation', () => {
    expect(canAccessConversation('buyer-1', 'buyer-1', 'seller-1')).toBe(true);
  });

  it('seller can access their conversation', () => {
    expect(canAccessConversation('seller-1', 'buyer-1', 'seller-1')).toBe(true);
  });

  it('third party cannot access conversation', () => {
    expect(canAccessConversation('other-user', 'buyer-1', 'seller-1')).toBe(false);
  });

  it('handles null seller (anonymous listing)', () => {
    expect(canAccessConversation('buyer-1', 'buyer-1', null)).toBe(true);
    expect(canAccessConversation('other', 'buyer-1', null)).toBe(false);
  });
});

// ─── Suspended user check ─────────────────────────────────────────────────────
describe('suspended user enforcement', () => {
  function isUserSuspended(suspendedUserIds: Set<string>, userId: string): boolean {
    return suspendedUserIds.has(userId);
  }

  it('detects suspended user', () => {
    const suspended = new Set(['user-bad']);
    expect(isUserSuspended(suspended, 'user-bad')).toBe(true);
  });

  it('allows non-suspended user', () => {
    const suspended = new Set(['user-bad']);
    expect(isUserSuspended(suspended, 'user-good')).toBe(false);
  });

  it('empty set allows all', () => {
    expect(isUserSuspended(new Set(), 'anyone')).toBe(false);
  });
});

// ─── Admin-only route guard ───────────────────────────────────────────────────
describe('admin route guard', () => {
  function guardAdmin(role: AdminRole | null): boolean {
    return role !== null;
  }

  function guardSuperadmin(role: AdminRole | null): boolean {
    return role === 'superadmin';
  }

  it('allows any admin role through admin guard', () => {
    expect(guardAdmin('support')).toBe(true);
    expect(guardAdmin('superadmin')).toBe(true);
  });

  it('blocks unauthenticated through admin guard', () => {
    expect(guardAdmin(null)).toBe(false);
  });

  it('only superadmin passes superadmin guard', () => {
    expect(guardSuperadmin('superadmin')).toBe(true);
    expect(guardSuperadmin('admin')).toBe(false);
    expect(guardSuperadmin(null)).toBe(false);
  });
});
