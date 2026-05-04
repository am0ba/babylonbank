import { supabase } from './lib/supabase.ts';
async function test() {
  const { data } = await supabase.from('accounts').select('*');
  console.log('Accounts:', data);
}
test();
