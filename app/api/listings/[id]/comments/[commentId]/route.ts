import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { isAuthorizedForSeller } from '@/lib/dealerAuth';
import { requireAdmin, hasRole } from '@/lib/admin';

// DELETE /api/listings/[id]/comments/[commentId]
// The comment's own author, the listing's seller/team, or an admin with at
// least the moderator role can delete it -- restricted above "support" per
// Derek's explicit call, unlike the private-message report system's
// dismiss action (which allows any admin role) that this was first modeled
// after.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id: listingId, commentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();

  const { data: comment } = await admin
    .from('listing_comments')
    .select('id, author_id, listings(seller_id)')
    .eq('id', commentId)
    .eq('listing_id', listingId)
    .single();
  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  const sellerId = (comment as any).listings?.seller_id ?? null;
  const adminRole = await requireAdmin(user.id);
  const canDelete = comment.author_id === user.id || await isAuthorizedForSeller(user.id, sellerId) || (!!adminRole && hasRole(adminRole, 'moderator'));
  if (!canDelete) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await admin.from('listing_comments').delete().eq('id', commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
