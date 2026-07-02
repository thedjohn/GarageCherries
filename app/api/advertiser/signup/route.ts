import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, password, businessName, contactName, phone, address, city, state, zip, category, tier } = body;

  if (!email || !password || !businessName) {
    return NextResponse.json({ error: 'email, password, and businessName are required' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create auth user
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  const userId = authData.user.id;

  // Resolve tier → radius
  const radiusMap: Record<string, number> = { starter: 15, metro: 30, regional: 60, statewide: 9999 };

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  // Insert advertiser record
  const { data, error } = await admin.from('advertisers').insert({
    user_id:       userId,
    business_name: businessName,
    contact_name:  contactName || null,
    phone:         phone || null,
    address:       address || null,
    city:          city || null,
    state:         state || null,
    zip:           zip || null,
    category:      category || 'other',
    tier:          tier || 'starter',
    radius_miles:  radiusMap[tier ?? 'starter'] ?? 15,
    active:        true,
    trial_ends_at: trialEndsAt,
  }).select().single();

  if (error) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, advertiserId: data.id });
}
