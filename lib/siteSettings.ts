import { createAdminClient } from '@/lib/supabase/server';

export interface SiteSettings {
  promoApplicationCutoff: string;
  promoExpiresAt: string;
  advertiserTrialDays: number;
  dealerDefaultTrialDays: number;
}

// Matches the values that were hardcoded across several routes before
// site_settings existed — used whenever the table/row isn't there yet or a
// query fails, so behavior never regresses to an undefined state.
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  promoApplicationCutoff: '2026-08-01T00:00:00Z',
  promoExpiresAt: '2026-10-31T23:59:59Z',
  advertiserTrialDays: 14,
  dealerDefaultTrialDays: 180,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from('site_settings').select('*').eq('id', 1).single();
    if (error || !data) return DEFAULT_SITE_SETTINGS;

    return {
      promoApplicationCutoff: data.promo_application_cutoff ?? DEFAULT_SITE_SETTINGS.promoApplicationCutoff,
      promoExpiresAt: data.promo_expires_at ?? DEFAULT_SITE_SETTINGS.promoExpiresAt,
      advertiserTrialDays: data.advertiser_trial_days ?? DEFAULT_SITE_SETTINGS.advertiserTrialDays,
      dealerDefaultTrialDays: data.dealer_default_trial_days ?? DEFAULT_SITE_SETTINGS.dealerDefaultTrialDays,
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}
