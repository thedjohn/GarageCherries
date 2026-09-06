import { createAdminClient } from '@/lib/supabase/server';

// For dealer-only routes: "what dealer does this user act as, if any?"
// Checks the parent (dealers.id === userId) first -- today's exact identity
// model, unchanged -- then falls back to dealer_members for a team member.
export async function resolveDealerId(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: ownRow } = await admin.from('dealers').select('id').eq('id', userId).maybeSingle();
  if (ownRow) return ownRow.id;
  const { data: membership } = await admin.from('dealer_members').select('dealer_id').eq('user_id', userId).maybeSingle();
  return membership?.dealer_id ?? null;
}

// For routes shared with private sellers, where `sellerId` is whatever the
// row's own seller_id already is (a dealer's id, or a private seller's own
// user id). Checks the exact existing direct-match condition FIRST -- a
// private seller or an existing dealer never even reaches the membership
// lookup, so their code path is byte-for-byte identical to before this
// existed. Only a genuinely new team-member case falls through to it.
export async function isAuthorizedForSeller(userId: string, sellerId: string | null | undefined): Promise<boolean> {
  if (!sellerId) return false;
  if (userId === sellerId) return true;
  const admin = createAdminClient();
  const { data } = await admin.from('dealer_members').select('id').eq('user_id', userId).eq('dealer_id', sellerId).maybeSingle();
  return !!data;
}
