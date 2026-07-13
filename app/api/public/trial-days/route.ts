import { NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/siteSettings';

export async function GET() {
  const settings = await getSiteSettings();
  const isPromo = new Date() < new Date(settings.promoApplicationCutoff);
  return NextResponse.json({
    advertiserTrialDays: settings.advertiserTrialDays,
    isPromo,
    promoExpiresAt: settings.promoExpiresAt,
  });
}
