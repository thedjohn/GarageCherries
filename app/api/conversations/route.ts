import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { listingId, listingTitle, sellerEmail, buyerName, message } = await req.json();
  if (!listingId || !sellerEmail || !message?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find or create conversation
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .single();

  let conversationId = existing?.id;

  if (!conversationId) {
    const { data: conv, error: convErr } = await admin
      .from('conversations')
      .insert({
        listing_id: listingId,
        listing_title: listingTitle,
        buyer_id: user.id,
        buyer_name: buyerName || user.email,
        buyer_email: user.email,
        seller_email: sellerEmail,
      })
      .select('id')
      .single();
    if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 });
    conversationId = conv.id;
  }

  // Insert first message
  const { error: msgErr } = await admin.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    sender_name: buyerName || user.email,
    body: message.trim(),
  });
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);

  return NextResponse.json({ conversationId });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Buyer conversations
  const { data: buyerConvs } = await supabase
    .from('conversations')
    .select('id, listing_id, listing_title, seller_email, buyer_name, last_message_at, created_at')
    .eq('buyer_id', user.id)
    .order('last_message_at', { ascending: false });

  // Seller conversations (listings where this user is the seller)
  const admin = createAdminClient();
  const { data: sellerListings } = await admin
    .from('listings')
    .select('id')
    .eq('seller_id', user.id);

  const sellerListingIds = (sellerListings ?? []).map(l => l.id);

  let sellerConvs: any[] = [];
  if (sellerListingIds.length > 0) {
    const { data } = await admin
      .from('conversations')
      .select('id, listing_id, listing_title, seller_email, buyer_name, buyer_email, last_message_at, created_at')
      .in('listing_id', sellerListingIds)
      .order('last_message_at', { ascending: false });
    sellerConvs = data ?? [];
  }

  // Merge, deduplicate by id
  const all = [...(buyerConvs ?? []), ...sellerConvs];
  const seen = new Set<string>();
  const conversations = all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  return NextResponse.json({ conversations, userId: user.id });
}
