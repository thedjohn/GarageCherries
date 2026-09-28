import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { findState } from 'zipcodes-us';

export async function POST(req: NextRequest) {
  const { email, zip } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }
  if (!zip || !/^\d{5}$/.test(String(zip).trim())) {
    return NextResponse.json({ error: 'A valid 5-digit ZIP code is required.' }, { status: 400 });
  }

  const stateResult = findState(String(zip).trim());
  if (!stateResult.isValid) {
    return NextResponse.json({ error: "That ZIP code doesn't look right." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('event_alert_subscribers')
    .upsert(
      {
        email: email.trim().toLowerCase(),
        zip: String(zip).trim(),
        state: stateResult.stateCode,
        unsubscribed_at: null, // re-subscribing clears any prior opt-out
      },
      { onConflict: 'email' },
    );

  if (error) {
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, state: stateResult.stateCode });
}
