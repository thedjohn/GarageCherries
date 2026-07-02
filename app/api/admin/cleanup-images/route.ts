import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin';

const BUCKET = 'listing-images';
const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = await requireAdmin(user?.id ?? null);
  if (role !== 'superadmin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Collect all image paths currently referenced by listings
  const { data: listings } = await admin.from('listings').select('images');
  const claimedPaths = new Set<string>();
  for (const listing of listings ?? []) {
    for (const url of listing.images ?? []) {
      const path = url.split(`/${BUCKET}/`)[1];
      if (path) claimedPaths.add(path);
    }
  }

  // List all files in storage
  const { data: files, error } = await admin.storage.from(BUCKET).list('', { limit: 10000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const cutoff = new Date(Date.now() - ORPHAN_AGE_MS);
  const orphans = (files ?? []).filter(f => {
    if (claimedPaths.has(f.name)) return false;
    const created = f.created_at ? new Date(f.created_at) : null;
    return created ? created < cutoff : false;
  });

  if (orphans.length === 0) {
    return NextResponse.json({ deleted: 0, message: 'No orphaned images found.' });
  }

  const paths = orphans.map(f => f.name);
  const { error: removeErr } = await admin.storage.from(BUCKET).remove(paths);
  if (removeErr) return NextResponse.json({ error: removeErr.message }, { status: 500 });

  return NextResponse.json({ deleted: paths.length, paths });
}
