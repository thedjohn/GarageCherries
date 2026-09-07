import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// PATCH /api/listings/[id]/comments/[commentId]/report
// Unlike private-message reporting (restricted to the two conversation
// participants), this is public content -- any logged-in user may report it.
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id: listingId, commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('listing_comments')
    .update({ reported: true })
    .eq('id', commentId)
    .eq('listing_id', listingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
