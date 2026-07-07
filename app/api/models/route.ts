import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const make = req.nextUrl.searchParams.get('make');
  if (!make) return NextResponse.json({ models: [] });

  const admin = createAdminClient();
  const { data } = await admin
    .from('listings')
    .select('model')
    .eq('make', make)
    .eq('status', 'approved')
    .eq('is_sold', false);

  const models = [...new Set((data ?? []).map((r: { model: string }) => r.model))]
    .filter(Boolean)
    .sort();

  return NextResponse.json({ models });
}
