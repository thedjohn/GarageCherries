import { createClient } from '@/lib/supabase/server';
import SellForm from './SellForm';
import SellGate from './SellGate';

export default async function SellPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <SellGate />;

  return <SellForm />;
}
