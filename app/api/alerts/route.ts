import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET /api/alerts — list buyer's saved searches
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ searches: data ?? [] });
}

// POST /api/alerts — create a saved search
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Max 10 per user
  const { count } = await supabase
    .from('saved_searches')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if ((count ?? 0) >= 10) {
    return NextResponse.json({ error: 'Maximum 10 alerts per account' }, { status: 400 });
  }

  const body = await request.json();
  const { name, make, model, yearMin, yearMax, priceMax, mileageMax, condition, bodyStyle, transmission, state } = body;

  // Require at least 2 criteria
  const criteria = [make, model, yearMin, yearMax, priceMax, mileageMax, condition?.length, bodyStyle, transmission, state].filter(Boolean);
  if (criteria.length < 2) {
    return NextResponse.json({ error: 'Set at least 2 search criteria' }, { status: 400 });
  }

  const { data, error } = await supabase.from('saved_searches').insert({
    user_id:      user.id,
    name:         name || null,
    make:         make || null,
    model:        model || null,
    year_min:     yearMin ? Number(yearMin) : null,
    year_max:     yearMax ? Number(yearMax) : null,
    price_max:    priceMax ? Number(priceMax) : null,
    mileage_max:  mileageMax ? Number(mileageMax) : null,
    condition:    condition?.length ? condition : null,
    body_style:   bodyStyle || null,
    transmission: transmission || null,
    state:        state || null,
  }).select().single();

  if (error) {
    if (error.code === 'P0001') {
      return NextResponse.json({ error: 'Maximum 10 alerts per account' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ search: data });
}

// PATCH /api/alerts — toggle pause or update
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, paused, active } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const updates: any = {};
  if (paused !== undefined) updates.paused = paused;
  if (active !== undefined) updates.active = active;

  const { error } = await supabase
    .from('saved_searches')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/alerts?id=xxx
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
