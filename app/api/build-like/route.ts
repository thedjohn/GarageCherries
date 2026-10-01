import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

// Same IP-hashing approach as /api/track-build-view -- never stores a raw IP.
function hashIp(request: NextRequest, buildId: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown';
  return createHash('sha256').update(ip + buildId).digest('hex').slice(0, 16);
}

export async function GET(request: NextRequest) {
  const buildId = request.nextUrl.searchParams.get('buildId');
  if (!buildId) return NextResponse.json({ error: 'buildId required' }, { status: 400 });

  const ipHash = hashIp(request, buildId);
  const supabase = createAdminClient();

  const [{ data: existing }, { count }] = await Promise.all([
    supabase.from('build_likes').select('id').eq('build_id', buildId).eq('ip_hash', ipHash).maybeSingle(),
    supabase.from('build_likes').select('id', { count: 'exact', head: true }).eq('build_id', buildId),
  ]);

  return NextResponse.json({ liked: !!existing, count: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const { buildId } = await request.json();
  if (!buildId) return NextResponse.json({ error: 'buildId required' }, { status: 400 });

  const ipHash = hashIp(request, buildId);
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('build_likes').select('id').eq('build_id', buildId).eq('ip_hash', ipHash).maybeSingle();

  if (existing) {
    await supabase.from('build_likes').delete().eq('id', existing.id);
  } else {
    await supabase.from('build_likes').insert({ build_id: buildId, ip_hash: ipHash });
  }

  const { count } = await supabase.from('build_likes').select('id', { count: 'exact', head: true }).eq('build_id', buildId);
  return NextResponse.json({ liked: !existing, count: count ?? 0 });
}
