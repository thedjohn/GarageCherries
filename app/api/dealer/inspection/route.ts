import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function requireOwnListing(carId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: dealer } = await admin
    .from('dealers').select('id')
    .or(`id.eq.${user.id},email.eq.${user.email}`)
    .single();
  if (!dealer) return { error: NextResponse.json({ error: 'Dealer not found' }, { status: 403 }) };

  const { data: listing } = await admin.from('listings').select('id, seller_id').eq('id', carId).single();
  if (!listing || listing.seller_id !== dealer.id) {
    return { error: NextResponse.json({ error: 'Listing not found' }, { status: 404 }) };
  }

  return { admin, dealerId: dealer.id as string };
}

// GET /api/dealer/inspection?carId=... -- fetch the report attached to a listing
export async function GET(request: NextRequest) {
  const carId = request.nextUrl.searchParams.get('carId');
  if (!carId) return NextResponse.json({ error: 'carId is required.' }, { status: 400 });

  const auth = await requireOwnListing(carId);
  if ('error' in auth) return auth.error;

  const { data, error } = await auth.admin
    .from('listing_inspections')
    .select('*')
    .eq('listing_id', carId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}

// POST /api/dealer/inspection -- attach or replace the report on a listing
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { carId, providerName, reportDate, summary, reportUrl, photoUrls } = body;
  if (!carId) return NextResponse.json({ error: 'carId is required.' }, { status: 400 });

  const auth = await requireOwnListing(carId);
  if ('error' in auth) return auth.error;

  if (!providerName?.trim()) return NextResponse.json({ error: 'Provider name is required.' }, { status: 400 });
  if (!reportUrl?.trim()) return NextResponse.json({ error: 'A report file is required.' }, { status: 400 });

  const { data, error } = await auth.admin
    .from('listing_inspections')
    .upsert({
      listing_id: carId,
      provider_name: providerName.trim(),
      report_date: reportDate || null,
      summary: summary?.trim() || null,
      report_url: reportUrl,
      photo_urls: Array.isArray(photoUrls) ? photoUrls : [],
      updated_at: new Date().toISOString(),
    }, { onConflict: 'listing_id' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}

// DELETE /api/dealer/inspection?carId=... -- remove the report from a listing
export async function DELETE(request: NextRequest) {
  const carId = request.nextUrl.searchParams.get('carId');
  if (!carId) return NextResponse.json({ error: 'carId is required.' }, { status: 400 });

  const auth = await requireOwnListing(carId);
  if ('error' in auth) return auth.error;

  const { data: existing } = await auth.admin
    .from('listing_inspections').select('report_url, photo_urls').eq('listing_id', carId).maybeSingle();

  const { error } = await auth.admin.from('listing_inspections').delete().eq('listing_id', carId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort storage cleanup -- the DB row is already gone either way
  if (existing) {
    const paths = [existing.report_url, ...(existing.photo_urls ?? [])]
      .filter(Boolean)
      .map((url: string) => url.split('/inspection-reports/')[1])
      .filter(Boolean);
    if (paths.length > 0) {
      await auth.admin.storage.from('inspection-reports').remove(paths);
    }
  }

  return NextResponse.json({ ok: true });
}
