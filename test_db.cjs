const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching profiles...");
  const { data, error } = await supabase.from('profiles').select('*');
  console.log("Profiles data:", data);
  if (error) console.error("Profile Error:", error);
  
  console.log("Fetching roles...");
  const { data: roles, error: err2 } = await supabase.from('app_roles').select('*');
  console.log("App roles:", roles);
  if (err2) console.error("Roles Error:", err2);
}
check();
