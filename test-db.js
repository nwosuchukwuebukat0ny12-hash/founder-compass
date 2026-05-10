import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // We need to login as an admin or founder to test RLS.
  // We don't have their password. We can just query without auth.
  const { data, error } = await supabase.from('messages').select('*');
  console.log("No auth select:", data, error);
}
test();
