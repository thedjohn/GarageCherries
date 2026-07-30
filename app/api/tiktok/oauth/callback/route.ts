import { NextRequest, NextResponse } from 'next/server';

// TEMPORARY, one-time bootstrap route -- exchanges the authorization code
// from TikTok's login flow for an access/refresh token pair, returned
// directly in the response so the account owner can copy them out. TikTok's
// Content Posting API doesn't need a browser redirect for every post once we
// have a refresh token -- this route only exists to complete that one-time
// handoff, since TikTok requires a real HTTPS redirect URI (localhost isn't
// allowed, unlike Google's Desktop OAuth client). Not wired into any
// ongoing user-facing flow.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  // The code_verifier (PKCE) is packed into `state` by the URL-generation
  // script, since this route has no server-side session to stash it in
  // between the initial redirect and this callback.
  const codeVerifier = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.json(
      { error, error_description: request.nextUrl.searchParams.get('error_description') },
      { status: 400 }
    );
  }
  if (!code || !codeVerifier) {
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 });
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.json({ error: 'TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET not configured' }, { status: 500 });
  }

  const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: 'https://www.garagecherries.com/api/tiktok/oauth/callback',
      code_verifier: codeVerifier,
    }),
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    return NextResponse.json({ error: 'Token exchange failed', tokenData }, { status: 502 });
  }

  return NextResponse.json(tokenData);
}
