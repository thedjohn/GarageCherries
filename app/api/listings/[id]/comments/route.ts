import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { createLogger } from '@/lib/logger';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';
import { isAuthorizedForSeller } from '@/lib/dealerAuth';

const resend = new Resend(process.env.RESEND_API_KEY);
const log = createLogger('api/listings/comments');

// POST /api/listings/[id]/comments
// Public Q&A on a listing. A top-level question (no parentId) can be posted
// by any logged-in buyer; a reply (parentId set) is seller-only -- buyers
// cannot reply to each other's questions. New top-level comments are NOT
// emailed immediately (see app/api/cron/listing-comments-digest/route.ts --
// batched hourly so a viral listing can't flood the seller's inbox); a
// seller's reply always emails the original asker right away, since a reply
// only ever reaches the one person who asked, no burst risk there.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ip = getClientIP(req);
  const { allowed, firstBlock } = rateLimit(`listing-comments:${ip}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    if (firstBlock) notifyAdmin('Rate limit hit: listing comments', `IP <strong>${ip}</strong> exceeded the listing-comment limit (20/hour).`);
    return NextResponse.json({ error: 'Too many comments. Please slow down.' }, { status: 429 });
  }

  const { id: listingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();

  const { data: suspension } = await admin
    .from('suspended_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (suspension) return NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 });

  const { body, parentId, authorName } = await req.json();
  if (!body?.trim() || !authorName?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const { data: listing } = await admin
    .from('listings')
    .select('id, title, seller_id')
    .eq('id', listingId)
    .single();
  if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  const isSeller = await isAuthorizedForSeller(user.id, listing.seller_id);

  if (parentId) {
    // Q&A style, decided with Derek -- only the seller/team may reply.
    if (!isSeller) return NextResponse.json({ error: 'Only the seller can reply to a question.' }, { status: 403 });

    const { data: parentComment } = await admin
      .from('listing_comments')
      .select('id, author_id')
      .eq('id', parentId)
      .eq('listing_id', listingId)
      .is('parent_id', null)
      .maybeSingle();
    if (!parentComment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    const { data: reply, error } = await admin.from('listing_comments').insert({
      listing_id: listingId,
      author_id: user.id,
      author_name: authorName.trim(),
      is_seller: true,
      body: body.trim(),
      parent_id: parentId,
    }).select('id, author_id, author_name, is_seller, body, parent_id, created_at').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Email the original asker immediately -- fire and forget.
    admin.auth.admin.getUserById(parentComment.author_id).then(({ data: { user: asker } }) => {
      if (!asker?.email || asker.user_metadata?.listing_comment_opt_out) return;
      const listingUrl = `https://www.garagecherries.com/listings/${listingId}`;
      const unsubscribeUrl = `https://www.garagecherries.com/unsubscribe/listing-comments?uid=${asker.id}`;
      return resend.emails.send({
        from: 'GarageCherries <no-reply@garagecherries.com>',
        to: asker.email,
        subject: `The seller replied to your question on ${listing.title}`,
        html: emailWrap(`
          <h1 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px">You got a reply</h1>
          <p style="color:#71717a;font-size:14px;margin:0 0 16px">The seller of <strong style="color:#18181b">${listing.title}</strong> replied to your question.</p>
          <div style="background:#f4f4f5;border-radius:10px;padding:16px 20px;margin-bottom:24px">
            <p style="font-size:14px;color:#18181b;margin:0">${body.trim()}</p>
          </div>
          <a href="${listingUrl}" style="display:block;text-align:center;background:#ef4444;color:white;font-weight:700;padding:14px 24px;border-radius:10px;text-decoration:none;font-size:15px;margin-bottom:24px">View the Listing →</a>
          <p style="color:#a1a1aa;font-size:12px;margin:0">
            <a href="${unsubscribeUrl}" style="color:#a1a1aa;">Unsubscribe from listing-comment notifications</a>
          </p>
        `),
      });
    }).then(() => {
      log.info('Reply notification email sent', { listingId, parentId });
      void log.flush();
    }).catch((err: unknown) => {
      log.error('Reply notification email failed', new Error(String(err)), { listingId, parentId });
      void log.flush();
    });

    return NextResponse.json({ comment: reply });
  }

  // New top-level question.
  const { data: comment, error } = await admin.from('listing_comments').insert({
    listing_id: listingId,
    author_id: user.id,
    author_name: authorName.trim(),
    is_seller: isSeller,
    body: body.trim(),
    parent_id: null,
  }).select('id, author_id, author_name, is_seller, body, parent_id, created_at').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  log.info('Listing comment posted', { listingId, userId: user.id });
  return NextResponse.json({ comment });
}
