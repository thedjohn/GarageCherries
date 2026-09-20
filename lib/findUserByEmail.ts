import type { User } from '@supabase/supabase-js';
import type { createAdminClient } from '@/lib/supabase/server';

// Finds one account by email via the find_user_id_by_email database function
// (supabase/migrations/20260920_find_user_id_by_email.sql), then loads the full
// user by id. Replaces a find() over auth.admin.listUsers(), which returns only
// the first 50 accounts and so silently missed every older one.
export async function findUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<{ user: User | null; error: string | null }> {
  const { data: id, error } = await admin.rpc('find_user_id_by_email', { p_email: email.trim().toLowerCase() });
  if (error) return { user: null, error: error.message };
  if (!id) return { user: null, error: null };

  const { data, error: getErr } = await admin.auth.admin.getUserById(id as string);
  if (getErr) return { user: null, error: getErr.message };
  return { user: data?.user ?? null, error: null };
}
