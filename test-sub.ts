import { supabase } from './lib/supabase.ts';
async function test() {
  const { data, error } = await supabase.from('users').select('subscription_active, subscription_expires_at').limit(1);
  console.log('Result:', data, error);
}
test();
