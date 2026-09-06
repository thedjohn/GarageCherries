import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import { emailWrap } from '@/lib/emailBranding';

const resend = new Resend(process.env.RESEND_API_KEY);

// GET /api/dealer/team -- list the authenticated dealer's (or team member's)
// fellow team members. Any team member can view the list; only the parent
// can add/remove (enforced in POST/DELETE below).
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: ownRow } = await admin.from('dealers').select('id').eq('id', user.id).maybeSingle();
  let dealerId = ownRow?.id as string | undefined;
  if (!dealerId) {
    const { data: membership } = await admin.from('dealer_members').select('dealer_id').eq('user_id', user.id).maybeSingle();
    dealerId = membership?.dealer_id;
  }
  if (!dealerId) return NextResponse.json({ error: 'Dealer not found' }, { status: 403 });

  const { data: members, error } = await admin
    .from('dealer_members')
    .select('id, user_id, invited_at')
    .eq('dealer_id', dealerId)
    .order('invited_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const team = await Promise.all((members ?? []).map(async m => {
    const { data: userData } = await admin.auth.admin.getUserById(m.user_id);
    return { id: m.id, email: userData?.user?.email ?? null, invitedAt: m.invited_at };
  }));

  return NextResponse.json({ team });
}

// POST /api/dealer/team -- invite a team member by email. Parent-only: a
// team member cannot invite another team member.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: dealer } = await admin.from('dealers').select('id, name').eq('id', user.id).maybeSingle();
  if (!dealer) return NextResponse.json({ error: 'Only the dealer account owner can invite team members' }, { status: 403 });

  const { email } = await request.json();
  const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!trimmedEmail || !trimmedEmail.includes('@')) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  // Reuses the exact same create-user-then-email pattern already proven in
  // the dealer application approval flow (POST /api/admin/dealer-applications)
  // -- a fresh auth user with no password, a recovery-link generated for it,
  // emailed to set a password, landing on the existing /dealer/login flow.
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: trimmedEmail,
    email_confirm: true,
  });

  let memberUserId: string;
  let isNewAccount: boolean;
  if (createErr) {
    // Most likely cause: this email already has an account (a buyer, a
    // dealer, or already a team member elsewhere) -- Supabase Auth requires
    // unique emails, so a brand-new account can't be created for it. Falls
    // back to linking their existing account instead of hard-failing.
    const { data: { users } } = await admin.auth.admin.listUsers();
    const existing = users.find(u => u.email?.toLowerCase() === trimmedEmail);
    if (!existing) return NextResponse.json({ error: createErr.message }, { status: 500 });
    memberUserId = existing.id;
    isNewAccount = false;
  } else {
    memberUserId = newUser.user.id;
    isNewAccount = true;
  }

  if (memberUserId === dealer.id) {
    return NextResponse.json({ error: 'You are already the dealer account owner' }, { status: 400 });
  }

  const { error: memberErr } = await admin.from('dealer_members').upsert({
    dealer_id: dealer.id,
    user_id: memberUserId,
  }, { onConflict: 'dealer_id,user_id' });
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 });

  if (isNewAccount) {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: trimmedEmail,
      options: { redirectTo: 'https://www.garagecherries.com/dealer/login' },
    });
    const actionLink = linkData?.properties?.action_link;
    const actionHtml = actionLink
      ? `<a href="${actionLink}" style="display:inline-block;background:#dc2626;color:#fff;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none">Set Your Password &amp; Get Started</a>`
      : `<p style="color:#dc2626">Please contact us at support@garagecherries.com to set up your password.</p>`;
    await resend.emails.send({
      from: 'GarageCherries <no-reply@garagecherries.com>',
      to: trimmedEmail,
      subject: `You've been added to ${dealer.name}'s GarageCherries team`,
      html: emailWrap(`
        <h1 style="font-size:22px;font-weight:800;color:#18181b;margin:0 0 16px">You're in!</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px">
          You've been added as a team member on <strong>${dealer.name}</strong>'s GarageCherries dealer account.
          Click below to set your password and access the dashboard.
        </p>
        ${actionHtml}
        <p style="color:#a1a1aa;font-size:12px;margin:32px 0 0">
          This link expires in 24 hours. If you weren't expecting this, you can ignore this email.
        </p>
      `),
    });
  } else {
    await resend.emails.send({
      from: 'GarageCherries <no-reply@garagecherries.com>',
      to: trimmedEmail,
      subject: `You've been added to ${dealer.name}'s GarageCherries team`,
      html: emailWrap(`
        <h1 style="font-size:22px;font-weight:800;color:#18181b;margin:0 0 16px">You're in!</h1>
        <p style="color:#52525b;font-size:15px;line-height:1.6;margin:0 0 24px">
          You've been added as a team member on <strong>${dealer.name}</strong>'s GarageCherries dealer account.
          Sign in with your existing GarageCherries account at
          <a href="https://www.garagecherries.com/dealer/login">garagecherries.com/dealer/login</a> to access the dashboard.
        </p>
      `),
    });
  }

  return NextResponse.json({ ok: true, isNewAccount });
}

// DELETE /api/dealer/team -- remove a team member. Parent-only.
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: dealer } = await admin.from('dealers').select('id').eq('id', user.id).maybeSingle();
  if (!dealer) return NextResponse.json({ error: 'Only the dealer account owner can remove team members' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'Member id is required' }, { status: 400 });

  const { error } = await admin.from('dealer_members').delete().eq('id', id).eq('dealer_id', dealer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
