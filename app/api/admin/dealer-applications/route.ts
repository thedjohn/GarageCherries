import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const note = rejection_note?.trim();
    resend.emails.send({
      from: 'GarageCherries <no-reply@garagecherries.com>',
      to: app.email,
      subject: 'Your GarageCherries Dealer Application',
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;">
          <p style="font-size:28px;margin:0 0 8px;">🍒</p>
          <h1 style="font-size:22px;font-weight:800;color:#18181b;margin:0 0 16px;">Hi ${app.name}, thanks for applying</h1>
          <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px;">
            After reviewing your application for <strong>${app.dealer_name}</strong>, we're unable to approve it at this time.
          </p>
          ${note ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#dc2626;margin:0 0 8px;">Feedback</p>
            <p style="font-size:14px;color:#7f1d1d;margin:0;">${note}</p>
          </div>` : ''}
          <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px;">
            If you have questions or would like to reapply, please reach out to us at
            <a href="mailto:support@garagecherries.com" style="color:#dc2626;">support@garagecherries.com</a>.
          </p>
          <p style="color:#a1a1aa;font-size:12px;margin:0;">GarageCherries · garagecherries.com</p>
        </div>
      `,
    }).catch(() => {});

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

  // Applications submitted during the 250th promo (before Aug 1 2026) expire Oct 31; otherwise 6 months
  const promoCutoff = new Date('2026-08-01T00:00:00Z');
  const isPromo = new Date(app.created_at) < promoCutoff;
  const betaExpiresAt = isPromo ? new Date('2026-10-31T23:59:59Z') : (() => { const d = new Date(); d.setMonth(d.getMonth() + 6); return d; })();

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

  // Generate password-set link and email it to the new dealer
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: app.email,
    options: { redirectTo: 'https://www.garagecherries.com/dealer/reset-password' },
  });
  const actionLink = linkData?.properties?.action_link;

  await resend.emails.send({
    from: 'GarageCherries <no-reply@garagecherries.com>',
    to: app.email,
    subject: 'Your GarageCherries Dealer Account is Approved 🍒',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px">
        <p style="font-size:28px;margin:0 0 8px">🍒</p>
        <h1 style="font-size:22px;font-weight:800;color:#18181b;margin:0 0 16px">Welcome to GarageCherries, ${app.name}!</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 16px">
          Your dealer account for <strong>${app.dealer_name}</strong> has been approved.
          You're on our ${isPromo ? 'free promo plan through October 31, 2026' : '6-month beta plan'} — no charges during that period.
        </p>
        <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px">
          Click below to set your password and access your dealer dashboard.
        </p>
        ${actionLink ? `
        <a href="${actionLink}" style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">
          Set Your Password & Get Started
        </a>` : `<p style="color:#dc2626">Please contact us at support@garagecherries.com to set up your password.</p>`}
        <p style="color:#a1a1aa;font-size:12px;margin:32px 0 0">
          This link expires in 24 hours. If you didn't apply for a dealer account, you can ignore this email.
        </p>
      </div>
    `,
  });

  // Mark application as approved
  await admin.from('dealer_applications').update({
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    reviewed_by: user!.id,
  }).eq('id', id);

  return NextResponse.json({ success: true, userId });
}
