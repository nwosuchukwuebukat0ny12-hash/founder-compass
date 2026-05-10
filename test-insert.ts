import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL as string, process.env.VITE_SUPABASE_ANON_KEY as string);

async function test() {
  console.log("Testing auth...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@collectivelab.com', // guess
    password: 'password123'
  });
  if (authError) {
    console.error("Auth error:", authError);
    // try to get any user
    const { data: users, error: userError } = await supabase.from('profiles').select('*').limit(1);
    console.log("Users:", users);
  } else {
      console.log("Auth success", authData.user.id);
  }
}
test();
