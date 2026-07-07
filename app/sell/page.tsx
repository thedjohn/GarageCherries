import { createClient } from '@/lib/supabase/server';
import SellGate from './SellGate';
import SellClient from './SellClient';

export default async function SellPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <SellGate />;
  return <SellClient />;
}
