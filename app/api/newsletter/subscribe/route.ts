import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// The monetization plan's fixed source categories -- kept as a whitelist so
// a public endpoint can't get arbitrary junk written into a field meant to
// power a future "where did this lead come from" report.
const VALID_SOURCES = ['instagram', 'facebook', 'organic_website', 'dealer_page', 'vehicle_page', 'affiliate_page'];

export async function POST(req: NextRequest) {
  const { email, firstName, source } = await req.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('newsletter_subscribers')
    .insert({
      email: email.trim().toLowerCase(),
      ...(firstName?.trim() ? { first_name: firstName.trim() } : {}),
      ...(VALID_SOURCES.includes(source) ? { source } : {}),
    });

  if (error) {
    if (error.code === '23505') {
      // Already subscribed — treat as success so we don't leak whether email exists
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
