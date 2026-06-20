import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { query } = await request.json();

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Parse this natural language classic car search query into structured filters. Return ONLY valid JSON with these optional fields:
- make (string, e.g. "Ford", "Chevrolet", "Dodge")
- yearMin (number)
- yearMax (number)
- priceMin (number)
- priceMax (number)
- condition (one of: "Excellent", "Good", "Fair", "Project")
- bodyStyle (e.g. "Coupe", "Convertible", "Muscle Car", "Sedan")
- transmission (one of: "Manual", "Automatic")
- state (2-letter US state code)

Query: "${query}"

Return only the JSON object, no explanation.`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
  try {
    const filters = JSON.parse(text.replace(/```json|```/g, '').trim());
    return NextResponse.json({ filters });
  } catch {
    return NextResponse.json({ filters: {} });
  }
}
