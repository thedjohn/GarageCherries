import { NextResponse } from 'next/server';

// GET /yt — short link for the YouTube channel profile, tagged so visits
// from it show up in GA4 as YouTube traffic.
export function GET() {
  return NextResponse.redirect('https://www.garagecherries.com/listings?utm_source=youtube&utm_medium=profile', 302);
}
