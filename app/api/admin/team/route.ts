import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';

// Only superadmins can manage the team
async function authSuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (role !== 'superadmin') return null;
  return user;
}

export async function GET() {
  const user = await authSuperadmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('admin_users')
    .select('user_id, email, role, created_at')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ team: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await authSuperadmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { email, role } = await req.json();
  if (!email || !['superadmin', 'admin', 'moderator', 'support'].includes(role)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const admin = createAdminClient();
  // Look up the user by email in auth.users
  const { data: { users }, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const target = users.find(u => u.email === email);
  if (!target) return NextResponse.json({ error: 'No account found with that email. They must sign up first.' }, { status: 404 });

  const { error } = await admin.from('admin_users').upsert({
    user_id: target.id,
    email: target.email!,
    role,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await authSuperadmin();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id } = await req.json();
  if (user_id === user.id) return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from('admin_users').delete().eq('user_id', user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
