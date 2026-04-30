const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eujtldssxdafrlhllnto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM4MDkxMSwiZXhwIjoyMDg1OTU2OTExfQ.7rco1KHqXz2ZNSgD2sWEBC3OXLWR_8JFqlviCYKDoNQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRoles() {
  console.log("Fetching roles...");
  const { data: roles, error } = await supabase.from('app_roles').select('*');
  if (error) { console.error("Error:", error); return; }

  for (const role of roles) {
    if (role.name.toLowerCase().includes('admin')) {
      if (!role.is_system) {
        console.log(`Updating ${role.name} to is_system=true`);
        await supabase.from('app_roles').update({ is_system: true }).eq('id', role.id);
      } else {
        console.log(`${role.name} is already is_system=true`);
      }
    } else {
      if (role.is_system) {
        console.log(`Updating ${role.name} to is_system=false`);
        await supabase.from('app_roles').update({ is_system: false }).eq('id', role.id);
      }
    }
  }
  console.log("Roles updated successfully!");
}

updateRoles();
