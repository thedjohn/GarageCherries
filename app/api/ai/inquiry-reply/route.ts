import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const { buyerName, buyerMessage, carYear, carMake, carModel, dealerName } = await request.json();

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `You are helping a classic car dealer draft a reply to a buyer inquiry.

Dealer: ${dealerName}
Car: ${carYear} ${carMake} ${carModel}
Buyer Name: ${buyerName}
Buyer's Message: "${buyerMessage}"

Write a friendly, professional reply from the dealer. Address the buyer's questions or interest directly. Keep it conversational and warm — classic car buyers are enthusiasts. Keep the reply to 2-3 short paragraphs. Start with "Hi ${buyerName}," and sign off with "${dealerName}". Do not add placeholders like [Phone Number] or [link] — just write a natural reply.`,
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return NextResponse.json({ reply: text });
}
