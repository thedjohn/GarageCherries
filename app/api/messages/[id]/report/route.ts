import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();

  // Verify user is a participant in the conversation this message belongs to
  const { data: message } = await admin
    .from('messages')
    .select('conversation_id, conversations(buyer_id, listing_id, listings(seller_id))')
    .eq('id', id)
    .single();

  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  const conv = (message as any).conversations;
  const sellerId = conv?.listings?.seller_id ?? null;
  const buyerId = conv?.buyer_id ?? null;

  if (user.id !== buyerId && user.id !== sellerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('messages').update({ reported: true }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();
  const { error } = await admin.from('messages').update({ reported: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
