import { NextResponse } from 'next/server';
import { fetchMakes } from '@/lib/db';

export async function GET() {
  const makes = await fetchMakes();
  return NextResponse.json({ makes });
}
