import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('newsletter_subscribers')
    .insert({ email: email.trim().toLowerCase() });

  if (error) {
    if (error.code === '23505') {
      // Already subscribed — treat as success so we don't leak whether email exists
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
