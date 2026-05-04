import { supabase } from './lib/supabase.ts';
async function test() {
  const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(20);
  console.log('Result:', data);
}
test();
