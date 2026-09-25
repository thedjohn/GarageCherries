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

  // Collect all image paths currently referenced by listings. Paginated past
  // Supabase/PostgREST's default 1000-row cap on an unbounded .select() --
  // the same gotcha count_listing_views_rpc was added to fix elsewhere in
  // this codebase. Without this, any listing past the first 1000 had its
  // images silently excluded from claimedPaths and permanently deleted by
  // this route as "orphans" despite being actively in use.
  const claimedPaths = new Set<string>();
  const LISTINGS_PAGE_SIZE = 1000;
  for (let page = 0; ; page++) {
    const { data: listings } = await admin
      .from('listings')
      .select('images')
      .range(page * LISTINGS_PAGE_SIZE, page * LISTINGS_PAGE_SIZE + LISTINGS_PAGE_SIZE - 1);
    for (const listing of listings ?? []) {
      for (const url of listing.images ?? []) {
        const path = url.split(`/${BUCKET}/`)[1];
        if (path) claimedPaths.add(path);
      }
    }
    if (!listings || listings.length < LISTINGS_PAGE_SIZE) break;
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
