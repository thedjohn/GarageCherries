import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: vi.fn() }));

import { withAmazonTag } from '@/components/ShopToolsCard';

describe('withAmazonTag', () => {
  it('returns the saved URL unchanged when no tag is given', () => {
    const url = 'https://www.amazon.com/dp/B01G5EA74I?tag=garagecherrie-20';
    expect(withAmazonTag(url)).toBe(url);
  });

  it('replaces an existing tag on an amazon.com link', () => {
    const out = withAmazonTag('https://www.amazon.com/dp/B01G5EA74I?tag=garagecherrie-20', 'garagecherrieslisting-20');
    expect(new URL(out).searchParams.get('tag')).toBe('garagecherrieslisting-20');
    expect(out).toContain('/dp/B01G5EA74I');
  });

  it('adds a tag to an amazon.com link that has none, keeping other params', () => {
    const out = withAmazonTag('https://amazon.com/dp/X?th=1', 'garagecherriesblog-20');
    const parsed = new URL(out);
    expect(parsed.searchParams.get('tag')).toBe('garagecherriesblog-20');
    expect(parsed.searchParams.get('th')).toBe('1');
  });

  it('leaves non-Amazon links alone', () => {
    const url = 'https://www.ebay.com/itm/123?campid=555';
    expect(withAmazonTag(url, 'garagecherrieslisting-20')).toBe(url);
  });

  it('does not treat look-alike hosts as Amazon', () => {
    const url = 'https://notamazon.com/dp/X?tag=x-20';
    expect(withAmazonTag(url, 'garagecherrieslisting-20')).toBe(url);
  });

  it('returns an unparseable URL unchanged', () => {
    expect(withAmazonTag('not a url', 'garagecherrieslisting-20')).toBe('not a url');
  });
});
