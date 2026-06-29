import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function verifyAccess(conversationId: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  // Is buyer?
  const { data: conv } = await admin
    .from('conversations')
    .select('buyer_id, listing_id')
    .eq('id', conversationId)
    .single();
  if (!conv) return false;
  if (conv.buyer_id === userId) return true;
  // Is seller of the listing?
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id')
    .eq('id', conv.listing_id)
    .single();
  return listing?.seller_id === userId;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const hasAccess = await verifyAccess(id, user.id);
  if (!hasAccess) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('messages')
    .select('id, sender_id, sender_name, body, reported, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const hasAccess = await verifyAccess(id, user.id);
  if (!hasAccess) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { body, senderName } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

  const admin = createAdminClient();

  // Fetch conversation details to find recipient and listing title
  const { data: conv } = await admin
    .from('conversations')
    .select('buyer_id, listing_id, listing_title')
    .eq('id', id)
    .single();

  const { error } = await admin.from('messages').insert({
    conversation_id: id,
    sender_id: user.id,
    sender_name: senderName || user.email,
    body: body.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date().toISOString();
  await admin.from('conversations').update({ last_message_at: now }).eq('id', id);

  // Broadcast to recipient's private notification channel
  if (conv) {
    let recipientId: string | null = null;
    if (conv.buyer_id === user.id) {
      // Sender is buyer — notify seller
      const { data: listing } = await admin.from('listings').select('seller_id').eq('id', conv.listing_id).single();
      recipientId = listing?.seller_id ?? null;
    } else {
      // Sender is seller — notify buyer
      recipientId = conv.buyer_id;
    }
    if (recipientId) {
      await admin.channel(`notifications:${recipientId}`).send({
        type: 'broadcast',
        event: 'new-message',
        payload: {
          conversationId: id,
          listingTitle: conv.listing_title,
          senderName: senderName || user.email,
          sentAt: now,
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}
