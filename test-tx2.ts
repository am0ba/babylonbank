import { supabase } from './lib/supabase.ts';
async function test() {
  const { data, error } = await supabase.from('transactions').select(`
    *,
    from_user:users!from_user_id(nick),
    to_user:users!to_user_id(nick)
  `).order('created_at', { ascending: false }).limit(1);
  console.log(data, error);
}
test();
