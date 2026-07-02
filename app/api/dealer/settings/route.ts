import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  // Verify the caller is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { dealerId, ...fields } = body;

  const admin = createAdminClient();

  // Verify the authenticated user owns this dealer record
  const { data: dealer } = await admin
    .from('dealers')
    .select('id, plan, beta_expires_at')
    .eq('id', user.id)
    .single();

  if (!dealer) return NextResponse.json({ error: 'Dealer not found' }, { status: 403 });
  if (dealerId && dealerId !== dealer.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.from('dealers').update(fields).eq('id', dealer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, plan: dealer.plan, beta_expires_at: dealer.beta_expires_at });
}
