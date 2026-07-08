import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// GET /api/dealer/export?format=json|csv
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const { data: dealer } = await admin
    .from('dealers')
    .select('id, name')
    .eq('id', user.id)
    .maybeSingle();
  if (!dealer) return NextResponse.json({ error: 'Not a dealer account' }, { status: 403 });

  const { data: listings, error } = await admin
    .from('listings')
    .select('id,title,year,make,model,price,mileage,condition,body_style,transmission,engine,color,interior_color,horsepower,torque,cylinders,displacement,forced_induction,fuel_type,num_speeds,drive_type,seat_material,seating_type,location,state,description,vin,vin_verified,status,is_sold,images,created_at,listed_at')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const format = new URL(request.url).searchParams.get('format') ?? 'json';

  if (format === 'csv') {
    const cols = ['id','title','year','make','model','price','mileage','condition','body_style','transmission','engine','color','interior_color','horsepower','torque','cylinders','displacement','forced_induction','fuel_type','num_speeds','drive_type','seat_material','seating_type','location','state','description','vin','vin_verified','status','is_sold','created_at','listed_at'];
    const escape = (v: unknown) => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const rows = [cols.join(','), ...(listings ?? []).map(r => cols.map(c => escape((r as Record<string, unknown>)[c])).join(','))];
    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${dealer.name.replace(/[^a-z0-9]/gi, '_')}_inventory.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify({ dealer: dealer.name, exported_at: new Date().toISOString(), count: listings?.length ?? 0, listings: listings ?? [] }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${dealer.name.replace(/[^a-z0-9]/gi, '_')}_inventory.json"`,
    },
  });
}
