import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin, hasRole } from '@/lib/admin';

// Search endpoint for the Featured Build admin picker -- mirrors the search
// shape of /api/admin/listings, scoped down to just what that picker needs
// (garage_vehicles has no single "title" column to ilike against, so this
// matches on make, model, or nickname instead).
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (!role || !hasRole(role, 'admin')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const search = params.get('search')?.trim();
  const limit = Math.min(25, Math.max(1, parseInt(params.get('limit') ?? '10', 10)));
  if (!search) return NextResponse.json({ vehicles: [] });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('garage_vehicles')
    .select('id, year, make, model, trim, nickname')
    .or(`make.ilike.%${search}%,model.ilike.%${search}%,nickname.ilike.%${search}%`)
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vehicles: data ?? [] });
}
