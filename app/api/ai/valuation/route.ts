import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { year, make, model, mileage, condition, price, bodyStyle, engine } = await request.json();

  console.log('ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a classic car valuation expert. A buyer wants to know if this listing price is fair.

Car: ${year} ${make} ${model}
${bodyStyle ? `Body Style: ${bodyStyle}` : ''}
${engine ? `Engine: ${engine}` : ''}
${mileage ? `Mileage: ${Number(mileage).toLocaleString()} miles` : ''}
${condition ? `Condition: ${condition}` : ''}
Listed Price: $${Number(price).toLocaleString()}

Give a concise 2-3 sentence assessment of whether this price is fair, low, or high for this vehicle in the current classic car market. Be direct and practical. Mention any key factors that affect value. Do not give a specific dollar range — just a relative assessment and reasoning.`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ assessment: text });
  } catch (e: any) {
    console.error('Valuation API error:', e);
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
