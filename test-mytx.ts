import { supabase } from './lib/supabase.ts';
async function test() {
  const { data } = await supabase.from('transactions')
    .select('*')
    .or('from_user_id.eq.2ecb6b96-34d7-4501-b9ee-ade9f32c43c8,to_user_id.eq.2ecb6b96-34d7-4501-b9ee-ade9f32c43c8')
    .order('created_at', { ascending: false })
    .limit(30);
  console.log(data);
}
test();
