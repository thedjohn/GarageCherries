import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { fileName, contentType } = await req.json();
  if (!fileName || !contentType) {
    return NextResponse.json({ error: 'Missing fileName or contentType' }, { status: 400 });
  }

  const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('listing-images')
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 });
  }

  const publicUrl = admin.storage.from('listing-images').getPublicUrl(path).data.publicUrl;

  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path, publicUrl });
}
