const { createClient } = require('@supabase/supabase-js');
const process = require('process');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { console.error("No credentials"); process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: roles, error } = await supabase.from('app_roles').select('*');
  if (error) { console.error(error); return; }
  console.log("Roles:");
  roles.forEach(r => console.log(`${r.name}: is_system=${r.is_system}, id=${r.id}`));
}
check();
