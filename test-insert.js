import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("Testing insert without auth...");
  const { data, error } = await supabase.from('messages').insert({
    startup_id: '123e4567-e89b-12d3-a456-426614174000',
    sender_id: '123e4567-e89b-12d3-a456-426614174000',
    content: 'Test message'
  });
  console.log(error);
}
test();
