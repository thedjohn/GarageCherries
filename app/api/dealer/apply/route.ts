import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit, getClientIP } from '@/lib/rateLimit';
import { verifyTurnstile } from '@/lib/verifyTurnstile';
import { notifyAdmin } from '@/lib/notifyAdmin';

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);
  const { allowed, firstBlock } = rateLimit(`dealer-apply:${ip}`, 3, 60 * 60 * 1000);
  if (!allowed) {
    if (firstBlock) notifyAdmin('Rate limit hit: dealer apply', `IP <strong>${ip}</strong> exceeded the dealer application limit (3/hour).`);
    return NextResponse.json({ error: 'Too many applications. Please try again later.' }, { status: 429 });
  }

  const body = await req.json();
  const { name, email, phone, dealerName, address, location, state, zip, website, specialties, description, captchaToken } = body;

  if (!await verifyTurnstile(captchaToken ?? null)) {
    return NextResponse.json({ error: 'CAPTCHA verification failed. Please try again.' }, { status: 400 });
  }

  if (!name || !email || !phone || !dealerName || !location || !state || !description) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check for duplicate pending/approved application or existing dealer with this email
  const [{ data: existingApp }, { data: existingDealer }] = await Promise.all([
    admin.from('dealer_applications').select('id, status').eq('email', email.toLowerCase().trim()).in('status', ['pending', 'approved']).maybeSingle(),
    admin.from('dealers').select('id').eq('email', email.toLowerCase().trim()).maybeSingle(),
  ]);

  if (existingDealer) {
    return NextResponse.json({ error: 'A dealer account already exists for this email address.' }, { status: 409 });
  }
  if (existingApp) {
    return NextResponse.json({ error: 'An application for this email is already under review.' }, { status: 409 });
  }

  const { error } = await admin.from('dealer_applications').insert({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    dealer_name: dealerName.trim(),
    address: address?.trim() || null,
    location: location.trim(),
    state: state.toUpperCase().slice(0, 2),
    zip: zip?.trim() || null,
    website: website?.trim() || null,
    specialties: specialties ? specialties.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    description: description.trim(),
    status: 'pending',
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
