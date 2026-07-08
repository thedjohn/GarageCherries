import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { createLogger } from '@/lib/logger';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';

const resend = new Resend(process.env.RESEND_API_KEY);

const log = createLogger('api/conversations');

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed, firstBlock } = rateLimit(`conversations:${ip}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    if (firstBlock) notifyAdmin('Rate limit hit: conversations', `IP <strong>${ip}</strong> exceeded the conversation limit (20/hour).`);
    return NextResponse.json({ error: 'Too many messages. Please slow down.' }, { status: 429 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Block suspended users
  const adminClient = createAdminClient();
  const { data: suspension } = await adminClient
    .from('suspended_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (suspension) return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });

  const { listingId, listingTitle, message } = await req.json();
  const buyerName = user.user_metadata?.full_name || user.email || '';
  if (!listingId || !message?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Fetch seller email server-side — never trust the client for this
  const { data: listing } = await admin
    .from('listings')
    .select('seller_email, seller_id, title')
    .eq('id', listingId)
    .single();
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  // Prefer auth email if seller has an account, fall back to listing seller_email
  let resolvedSellerEmail = listing.seller_email ?? '';
  if (listing.seller_id) {
    const { data: { user: sellerUser } } = await admin.auth.admin.getUserById(listing.seller_id);
    if (sellerUser?.email) resolvedSellerEmail = sellerUser.email;
  }

  const resolvedTitle = listingTitle || listing.title;

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
        listing_title: resolvedTitle,
        buyer_id: user.id,
        buyer_name: buyerName || user.email,
        buyer_email: user.email,
        seller_email: resolvedSellerEmail,
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
  if (msgErr) {
    log.error('Failed to insert message', { listingId, userId: user.id, error: msgErr.message });
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);

  // Email seller on first contact only — fire and forget
  if (!existing && resolvedSellerEmail) {
    const accountUrl = 'https://www.garagecherries.com/account?tab=messages';
    resend.emails.send({
      from: 'GarageCherries <no-reply@garagecherries.com>',
      to: resolvedSellerEmail,
      subject: `New message about your listing — ${resolvedTitle}`,
      html: emailWrap(`
        <h1 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px">You have a new message</h1>
        <p style="color:#71717a;font-size:14px;margin:0 0 16px"><strong style="color:#18181b">${buyerName}</strong> sent you a message about your listing <strong style="color:#18181b">${resolvedTitle}</strong>.</p>
        <div style="background:#f4f4f5;border-radius:10px;padding:16px 20px;margin-bottom:24px">
          <p style="font-size:14px;color:#18181b;margin:0">${message.trim()}</p>
        </div>
        <a href="${accountUrl}" style="display:block;text-align:center;background:#ef4444;color:white;font-weight:700;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:24px">Reply to Message →</a>
        <p style="color:#a1a1aa;font-size:12px;margin:0">You can manage all your messages from your <a href="${accountUrl}" style="color:#71717a">account page</a>.</p>
      `),
    }).then(() => {
      log.info('New conversation email sent', { conversationId, listingId, sellerEmail: resolvedSellerEmail });
      void log.flush();
    }).catch((err: unknown) => {
      log.error('New conversation email failed', new Error(String(err)), { conversationId, listingId, sellerEmail: resolvedSellerEmail });
      void log.flush();
    });
  }

  log.info('Conversation message sent', { conversationId, listingId, userId: user.id, isNew: !existing?.id });
  return NextResponse.json({ conversationId });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const page  = Math.max(1, parseInt(params.get('page')  ?? '1',  10));
  const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') ?? '20', 10)));

  // Buyer conversations
  const { data: buyerConvs } = await supabase
    .from('conversations')
    .select('id, listing_id, listing_title, seller_email, buyer_id, buyer_name, last_message_at, created_at')
    .eq('buyer_id', user.id)
    .order('last_message_at', { ascending: false });

  // Seller conversations (listings where this user is the seller)
  const adminClient = createAdminClient();
  const { data: sellerListings } = await adminClient
    .from('listings')
    .select('id')
    .eq('seller_id', user.id);

  const sellerListingIds = (sellerListings ?? []).map(l => l.id);

  let sellerConvs: any[] = [];
  if (sellerListingIds.length > 0) {
    const { data } = await adminClient
      .from('conversations')
      .select('id, listing_id, listing_title, seller_email, buyer_name, buyer_email, last_message_at, created_at')
      .in('listing_id', sellerListingIds)
      .order('last_message_at', { ascending: false });
    sellerConvs = data ?? [];
  }

  // Merge, deduplicate, sort
  const all = [...(buyerConvs ?? []), ...sellerConvs];
  const seen = new Set<string>();
  const sorted = all
    .filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; })
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  const total = sorted.length;
  const conversations = sorted.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ conversations, userId: user.id, total, page, limit });
}
