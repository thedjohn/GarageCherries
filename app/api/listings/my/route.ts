import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { resolveDealerId } from '@/lib/dealerAuth';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const admin = createAdminClient();
  // Falls back to the user's own id when they're not a dealer or team member
  // at all -- private sellers query by their own literal id, unchanged.
  const sellerId = (await resolveDealerId(user.id)) ?? user.id;
  const { data, error } = await admin
    .from('listings')
    .select('id,slug,title,year,make,model,price,mileage,condition,body_style,transmission,engine,fuel_type,color,interior_color,seat_material,location,state,images,description,seller_name,seller_phone,seller_email,status,is_sold,rejection_reason,resubmission_note,resubmission_count,created_at,featured,expires_at')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data ?? [] });
}
