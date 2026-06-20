import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { currentCarId, year, make, model, bodyStyle, engine, price, condition } = await request.json();

  const supabase = createAdminClient();

  const { data: listings } = await supabase
    .from('listings')
    .select('id, year, make, model, body_style, engine, price, condition, slug, primary_image_url, location_city, location_state')
    .eq('status', 'active')
    .neq('id', currentCarId)
    .limit(50);

  if (!listings || listings.length === 0) {
    return NextResponse.json({ ids: [] });
  }

  const listingSummaries = listings.map(l =>
    `ID:${l.id} | ${l.year} ${l.make} ${l.model} | ${l.body_style || ''} | ${l.engine || ''} | $${Number(l.price).toLocaleString()} | ${l.condition || ''}`
  ).join('\n');

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `A buyer is viewing: ${year} ${make} ${model} | ${bodyStyle || ''} | ${engine || ''} | $${Number(price).toLocaleString()} | ${condition || ''}

From the listings below, pick the 4 most similar or complementary cars a classic car enthusiast would also want to see. Consider era, make, body style, price range, and appeal. Return ONLY a JSON array of the 4 IDs in order of relevance, e.g. [12, 7, 33, 2]. No explanation.

Available listings:
${listingSummaries}`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '[]';
  let ids: number[] = [];
  try {
    ids = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    ids = [];
  }

  const ranked = ids
    .map(id => listings.find(l => l.id === id))
    .filter(Boolean);

  return NextResponse.json({ listings: ranked });
}
