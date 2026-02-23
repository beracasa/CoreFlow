const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service key to bypass RLS!
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: roles } = await supabase.from('app_roles').select('*');
  console.log("App Roles:");
  console.table(roles.map(r => ({id: r.id, name: r.name})));
  
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log("Profiles:");
  console.table(profiles.map(p => ({id: p.id, email: p.email, role: p.role, full_name: p.full_name})));
}
check();
