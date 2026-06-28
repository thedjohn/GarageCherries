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
  const { error } = await admin.from('messages').insert({
    conversation_id: id,
    sender_id: user.id,
    sender_name: senderName || user.email,
    body: body.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ success: true });
}
