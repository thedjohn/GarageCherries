import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Verify user owns this conversation
  const { data: conv } = await supabase.from('conversations').select('id').eq('id', id).single();
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, sender_name, body, reported, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { body, senderName } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 });

  const { data: conv } = await supabase.from('conversations').select('id').eq('id', id).single();
  if (!conv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = createAdminClient();
  const { error } = await admin.from('messages').insert({
    conversation_id: id,
    sender_id: user.id,
    sender_name: senderName || user.email,
    body: body.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await admin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ success: true });
}
