import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: applications, error } = await admin
    .from('dealer_applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: applications ?? [] });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, action, rejection_note } = body;
  if (!id || !action) return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
  if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  const admin = createAdminClient();

  const { data: app, error: fetchErr } = await admin
    .from('dealer_applications')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  if (app.status !== 'pending') return NextResponse.json({ error: 'Application is no longer pending' }, { status: 409 });

  if (action === 'reject') {
    const { error } = await admin
      .from('dealer_applications')
      .update({ status: 'rejected', rejection_note: rejection_note?.trim() || null, reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Approve: create auth user + dealer row, then send password reset email
  const slug = app.dealer_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Create the auth user (confirmed, no password — they'll set it via reset link)
  const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
    email: app.email,
    user_metadata: { full_name: app.name },
    email_confirm: true,
  });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  const userId = newUser.user.id;

  // Insert dealer row with 6-month beta plan
  const betaExpiresAt = new Date();
  betaExpiresAt.setMonth(betaExpiresAt.getMonth() + 6);

  const { error: dealerErr } = await admin.from('dealers').insert({
    id: userId,
    slug,
    name: app.dealer_name,
    email: app.email,
    phone: app.phone || null,
    address: app.address || null,
    location: app.location,
    state: app.state,
    zip: app.zip || null,
    website: app.website || null,
    specialties: app.specialties || [],
    description: app.description || null,
    plan: 'beta',
    beta_expires_at: betaExpiresAt.toISOString(),
  });

  if (dealerErr) {
    // Roll back auth user if dealer insert fails
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: dealerErr.message }, { status: 500 });
  }

  // Send password reset so they can set their own password
  await admin.auth.admin.generateLink({
    type: 'recovery',
    email: app.email,
  });

  // Mark application as approved
  await admin.from('dealer_applications').update({
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user!.id,
  }).eq('id', id);

  return NextResponse.json({ success: true, userId });
}
