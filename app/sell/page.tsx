import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import SellGate from './SellGate';
import SellClient from './SellClient';

export default async function SellPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <SellGate />;

  // Dealers have their own Add Vehicle flow (different fields, auto-approved,
  // pre-filled from their profile) -- send them there instead of the
  // private-seller form, which is missing dealer-only fields and would
  // require admin approval.
  const admin = createAdminClient();
  const { data: dealer } = await admin.from('dealers').select('id').eq('id', user.id).maybeSingle();
  if (dealer) redirect('/dealer/dashboard?tab=inventory&add=1');

  return <SellClient />;
}
