import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';
import { getSiteSettings } from '@/lib/siteSettings';

// GET — any admin role can view current settings (mirrors admin/team's GET,
// which any team member can call so the Header can detect admin status).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

// PATCH — superadmin only. Body dates are plain YYYY-MM-DD (from <input type="date">);
// application cutoff is normalized to start-of-day UTC (matches "applied before this
// instant" semantics), promo expiry to end-of-day UTC (matches "free through this
// whole day" semantics used everywhere else in the app).
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (role !== 'superadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { promoApplicationCutoff, promoExpiresAt, advertiserTrialDays, dealerDefaultTrialDays } = body;

  if (!promoApplicationCutoff || isNaN(Date.parse(promoApplicationCutoff))) {
    return NextResponse.json({ error: 'Invalid promoApplicationCutoff date' }, { status: 400 });
  }
  if (!promoExpiresAt || isNaN(Date.parse(promoExpiresAt))) {
    return NextResponse.json({ error: 'Invalid promoExpiresAt date' }, { status: 400 });
  }
  const advDays = Number(advertiserTrialDays);
  const dealerDays = Number(dealerDefaultTrialDays);
  if (!Number.isInteger(advDays) || advDays <= 0) {
    return NextResponse.json({ error: 'advertiserTrialDays must be a positive whole number' }, { status: 400 });
  }
  if (!Number.isInteger(dealerDays) || dealerDays <= 0) {
    return NextResponse.json({ error: 'dealerDefaultTrialDays must be a positive whole number' }, { status: 400 });
  }

  // Guard against a full ISO string slipping through instead of plain YYYY-MM-DD
  const cutoffDate = String(promoApplicationCutoff).slice(0, 10);
  const expiresDate = String(promoExpiresAt).slice(0, 10);

  const admin = createAdminClient();
  const { error } = await admin.from('site_settings').upsert({
    id: 1,
    promo_application_cutoff: `${cutoffDate}T00:00:00.000Z`,
    promo_expires_at: `${expiresDate}T23:59:59.000Z`,
    advertiser_trial_days: advDays,
    dealer_default_trial_days: dealerDays,
    updated_at: new Date().toISOString(),
    updated_by: user!.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
