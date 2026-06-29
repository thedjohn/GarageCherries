import { createAdminClient } from '@/lib/supabase/server';

export type AdminRole = 'superadmin' | 'admin' | 'moderator' | 'support';

const ROLE_HIERARCHY: AdminRole[] = ['support', 'moderator', 'admin', 'superadmin'];

export function hasRole(userRole: AdminRole, minRole: AdminRole): boolean {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(minRole);
}

export async function getAdminRole(userId: string): Promise<AdminRole | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .single();
  return (data?.role as AdminRole) ?? null;
}

export async function requireAdmin(userId: string | null): Promise<AdminRole | null> {
  if (!userId) return null;
  return getAdminRole(userId);
}
