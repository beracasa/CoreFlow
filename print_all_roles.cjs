const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eujtldssxdafrlhllnto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM4MDkxMSwiZXhwIjoyMDg1OTU2OTExfQ.7rco1KHqXz2ZNSgD2sWEBC3OXLWR_8JFqlviCYKDoNQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRoles() {
  console.log("Fetching roles...");
  const { data: roles, error } = await supabase.from('app_roles').select('*');
  if (error) { console.error("Error:", error); return; }

  console.log("Roles count:", roles.length);
  for (const role of roles) {
    console.log(role.name, role.is_system);
  }
}

updateRoles();
