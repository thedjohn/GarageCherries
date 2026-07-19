import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { notifyAdmin } from '@/lib/notifyAdmin';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/sitemap-health');
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.garagecherries.com';
const BATCH_SIZE = 15;

async function checkUrl(url: string): Promise<{ url: string; status: number }> {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    return { url, status: res.status };
  } catch {
    return { url, status: 0 };
  }
}

// GET /api/cron/sitemap-health
// Called daily by Vercel Cron. Two independent checks against the live sitemap:
// (1) completeness — every currently-live listing must have a URL in the sitemap
//     (catches staleness/caching gaps, e.g. a newly-approved listing not yet reflected);
// (2) reachability — every URL the sitemap actually lists must resolve with a 2xx/3xx
//     (catches dead links, e.g. a route that 404s for real data it wasn't built to handle).
// Emails derek_ljohnson@yahoo.com via notifyAdmin() only when something is actually wrong.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const [{ data: liveRows }, sitemapRes] = await Promise.all([
    admin.from('listings').select('id').eq('status', 'approved').eq('is_sold', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`),
    fetch(`${BASE_URL}/sitemap.xml`),
  ]);

  const sitemapXml = await sitemapRes.text();
  const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  // Completeness: every currently-live listing's detail URL must appear in the sitemap.
  // Detail URLs are the only ones with 4 segments after "/listings/" (make/model/id/slug);
  // the id is the 3rd segment.
  const sitemapListingIds = new Set<string>();
  for (const u of urls) {
    const after = u.split('/listings/')[1];
    const segs = after ? after.split('/').filter(Boolean) : [];
    if (segs.length === 4) sitemapListingIds.add(segs[2]);
  }
  const liveIds = (liveRows ?? []).map(r => r.id as string);
  const missingIds = liveIds.filter(id => !sitemapListingIds.has(id));

  // Reachability: request every sitemap URL in small concurrent batches (188 URLs today
  // and growing — sequential requests would risk the cron function's execution time limit).
  const results: { url: string; status: number }[] = [];
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    const batch = urls.slice(i, i + BATCH_SIZE);
    results.push(...await Promise.all(batch.map(checkUrl)));
  }
  const broken = results.filter(r => r.status < 200 || r.status >= 400);

  const issues: string[] = [];
  if (missingIds.length > 0) {
    issues.push(`${missingIds.length} live listing(s) missing from the sitemap: ${missingIds.join(', ')}`);
  }
  if (broken.length > 0) {
    issues.push(`${broken.length} broken URL(s) in the sitemap:<br/>${broken.map(b => `${b.url} &rarr; ${b.status || 'no response'}`).join('<br/>')}`);
  }

  if (issues.length > 0) {
    notifyAdmin('Sitemap health check found issues', issues.join('<br/><br/>'));
    log.warn('Sitemap health check found issues', { missingCount: missingIds.length, brokenCount: broken.length });
  } else {
    log.info('Sitemap health check passed', { urlCount: urls.length, liveListingCount: liveIds.length });
  }
  await log.flush();

  return NextResponse.json({
    ok: issues.length === 0,
    urlCount: urls.length,
    liveListingCount: liveIds.length,
    missingCount: missingIds.length,
    brokenCount: broken.length,
    issues,
  });
}
