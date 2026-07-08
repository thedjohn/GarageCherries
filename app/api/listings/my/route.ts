import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('listings')
    .select('id,slug,title,year,make,model,price,mileage,condition,body_style,transmission,engine,color,location,state,images,description,seller_name,seller_phone,seller_email,status,is_sold,rejection_reason,resubmission_note,resubmission_count,created_at,featured,expires_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}
