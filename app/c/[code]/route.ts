import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeListingCode } from '@/lib/listingCode';
import { toSegment } from '@/lib/data';

const BASE_URL = 'https://www.garagecherries.com';

// GET /c/<code> — opens the listing for a YouTube Shorts code (e.g.
// garagecherries.com/c/GC-7KQ4M). The UTM parameters are captured as
// first-touch attribution (components/UtmCapture.tsx), so these visits and
// any lead that follows show up in GA4 with source "youtube-code".
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeListingCode(decodeURIComponent(raw));
  if (!code) return NextResponse.redirect(`${BASE_URL}/listings`, 302);

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from('listings')
    .select('id, make, model, slug')
    .eq('listing_code', code)
    .neq('status', 'rejected')
    .maybeSingle();

  if (!listing) {
    return NextResponse.redirect(`${BASE_URL}/listings?q=${encodeURIComponent(raw)}`, 302);
  }

  const utm = new URLSearchParams({
    utm_source: 'youtube-code',
    utm_medium: 'shorts',
    utm_campaign: 'listing',
    utm_content: `GC-${code}`,
  });
  return NextResponse.redirect(
    `${BASE_URL}/listings/${toSegment(listing.make)}/${toSegment(listing.model)}/${listing.id}/${listing.slug}?${utm.toString()}`,
    302,
  );
}
