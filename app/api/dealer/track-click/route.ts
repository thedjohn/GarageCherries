import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const { dealerId, listingId, clickType } = await request.json();
  if (!dealerId || (clickType !== 'website' && clickType !== 'phone')) {
    return NextResponse.json({ ok: false });
  }

  const supabase = createAdminClient();
  await supabase.from('dealer_link_clicks').insert({ dealer_id: dealerId, listing_id: listingId ?? null, click_type: clickType });

  return NextResponse.json({ ok: true });
}
