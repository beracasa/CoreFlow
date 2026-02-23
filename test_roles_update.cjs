const { createClient } = require('@supabase/supabase-js');
const process = require('process');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { process.exit(1); }

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching roles...");
  // 1. Get the admin role ID
  const { data: roles, error: roleError } = await supabase.from('app_roles').select('*');
  if (roleError) { console.error("Error fetching roles:", roleError); return; }
  
  console.log("Roles found:", roles.map(r => r.name));
  
  const adminRole = roles.find(r => r.name.toLowerCase().includes('admin') || r.is_system === true);
  if (!adminRole) { console.error("Could not find admin role!"); return; }
  
  console.log("Found admin role:", adminRole.name, adminRole.id);
  
  // 2. Get all users to find Eduardo
  console.log("Fetching profiles...");
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
  if (profileError) { console.error("Error fetching profiles:", profileError); return; }
  
  const eduardo = profiles[0]; // Assuming he is the only one or the first one if there are few
  if (!eduardo) { console.error("No profiles found!"); return; }
  
  console.log("Updating profile for:", eduardo.email, eduardo.full_name);
  
  // 3. Force update
  const { error: updateError } = await supabase.from('profiles').update({ role_id: adminRole.id }).eq('id', eduardo.id);
  
  if (updateError) {
      console.error("Failed to update profile:", updateError);
  } else {
      console.log("Successfully updated Eduardo's role to Admin!");
  }
}
check();
