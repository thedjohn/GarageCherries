import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasRole, getAdminRole, requireAdmin } from '@/lib/admin';
import type { AdminRole } from '@/lib/admin';

// ── hasRole (pure function) ───────────────────────────────────────────────────

describe('hasRole', () => {
  it('superadmin has all roles', () => {
    expect(hasRole('superadmin', 'superadmin')).toBe(true);
    expect(hasRole('superadmin', 'admin')).toBe(true);
    expect(hasRole('superadmin', 'moderator')).toBe(true);
    expect(hasRole('superadmin', 'support')).toBe(true);
  });

  it('admin does not have superadmin', () => {
    expect(hasRole('admin', 'superadmin')).toBe(false);
  });

  it('admin has admin, moderator, support', () => {
    expect(hasRole('admin', 'admin')).toBe(true);
    expect(hasRole('admin', 'moderator')).toBe(true);
    expect(hasRole('admin', 'support')).toBe(true);
  });

  it('moderator does not have admin or superadmin', () => {
    expect(hasRole('moderator', 'admin')).toBe(false);
    expect(hasRole('moderator', 'superadmin')).toBe(false);
  });

  it('moderator has moderator and support', () => {
    expect(hasRole('moderator', 'moderator')).toBe(true);
    expect(hasRole('moderator', 'support')).toBe(true);
  });

  it('support only has support', () => {
    expect(hasRole('support', 'support')).toBe(true);
    expect(hasRole('support', 'moderator')).toBe(false);
    expect(hasRole('support', 'admin')).toBe(false);
    expect(hasRole('support', 'superadmin')).toBe(false);
  });

  it('hierarchy is ordered: support < moderator < admin < superadmin', () => {
    const roles: AdminRole[] = ['support', 'moderator', 'admin', 'superadmin'];
    for (let i = 0; i < roles.length; i++) {
      for (let j = 0; j < roles.length; j++) {
        expect(hasRole(roles[i], roles[j])).toBe(i >= j);
      }
    }
  });
});

// ── getAdminRole and requireAdmin (Supabase-dependent) ───────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from '@/lib/supabase/server';

function makeMockClient(role: string | null) {
  const single = vi.fn().mockResolvedValue({ data: role ? { role } : null, error: null });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as ReturnType<typeof createAdminClient>;
}

describe('getAdminRole', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the role from the database', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeMockClient('admin'));
    const role = await getAdminRole('user-123');
    expect(role).toBe('admin');
  });

  it('returns null when user has no admin record', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeMockClient(null));
    const role = await getAdminRole('nobody');
    expect(role).toBeNull();
  });

  it('returns superadmin role correctly', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeMockClient('superadmin'));
    expect(await getAdminRole('root')).toBe('superadmin');
  });
});

describe('requireAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns null for null userId', async () => {
    const role = await requireAdmin(null);
    expect(role).toBeNull();
    expect(createAdminClient).not.toHaveBeenCalled();
  });

  it('returns the role when userId is provided', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeMockClient('moderator'));
    const role = await requireAdmin('user-abc');
    expect(role).toBe('moderator');
  });

  it('returns null when user is not in admin_users table', async () => {
    (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(makeMockClient(null));
    expect(await requireAdmin('regular-user')).toBeNull();
  });
});
