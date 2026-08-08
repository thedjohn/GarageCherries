import type { createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';

// Emails every watchlist user that a car they saved has sold, with a nudge to
// review the dealer. Called from both the manual "Mark as Sold" button
// (app/api/cars/sold/route.ts) and the automated feed-sync mark-sold path
// (app/api/cron/dealer-feed-sync/route.ts) -- a car can go sold either way,
// and watchers should be notified regardless of which one happened.
export async function notifyWatchersCarSold(
  admin: ReturnType<typeof createAdminClient>,
  carId: string,
  carTitle: string,
  dealerId: string,
): Promise<void> {
  const { data: watchers } = await admin
    .from('watchlists')
    .select('user_id')
    .eq('car_id', carId);
  if (!watchers?.length) return;

  const userIds = watchers.map((w: { user_id: string }) => w.user_id);
  const { data: { users } } = await admin.auth.admin.listUsers();
  const recipients = users
    .filter((u: { id: string; email?: string; user_metadata?: { car_sold_opt_out?: boolean } }) =>
      userIds.includes(u.id) && u.email && !u.user_metadata?.car_sold_opt_out)
    .map((u: { id: string; email?: string }) => ({ id: u.id, email: u.email! }));
  if (!recipients.length) return;

  const { data: dealer } = await admin.from('dealers').select('slug, name').eq('id', dealerId).maybeSingle();

  const reviewSection = dealer
    ? `
      <p style="color:#52525b;margin:24px 0 8px">Bought this car, or worked with ${dealer.name}? Let other buyers know how it went.</p>
      <a href="https://www.garagecherries.com/dealers/${dealer.slug}#reviews"
         style="background:#18181b;color:#fff;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;margin-bottom:8px;">
        Leave a Review
      </a>`
    : '';

  const resend = new Resend(process.env.RESEND_API_KEY);
  await Promise.allSettled(recipients.map(({ id, email }: { id: string; email: string }) => {
    const unsubscribeUrl = `https://www.garagecherries.com/unsubscribe/car-sold?uid=${id}`;
    return resend.emails.send({
      from: 'GarageCherries <noreply@garagecherries.com>',
      to: email,
      subject: `${carTitle} has sold`,
      html: emailWrap(`
          <h1 style="font-size:20px;font-weight:800;color:#18181b;margin:0 0 8px">A car on your watchlist has sold</h1>
          <p style="color:#52525b;margin:0 0 8px"><strong>${carTitle}</strong> has been marked as sold.</p>
          <p style="color:#52525b;margin:0 0 24px">Browse similar listings on GarageCherries to find your next vehicle.</p>
          <a href="https://www.garagecherries.com/listings"
             style="background:#dc2626;color:#fff;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">
            Browse Listings
          </a>
          ${reviewSection}
          <p style="color:#a1a1aa;font-size:12px;margin-top:24px">
            You're receiving this because you're watching this listing on GarageCherries.<br/>
            <a href="${unsubscribeUrl}" style="color:#a1a1aa;">Unsubscribe from &quot;car sold&quot; notifications</a>
          </p>
        `),
    });
  }));
}
