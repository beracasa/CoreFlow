const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eujtldssxdafrlhllnto.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1anRsZHNzeGRhZnJsaGxsbnRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM4MDkxMSwiZXhwIjoyMDg1OTU2OTExfQ.7rco1KHqXz2ZNSgD2sWEBC3OXLWR_8JFqlviCYKDoNQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: roles, error } = await supabase.from('app_roles').select('*');
  if (error) { console.error("Error:", error); return; }

  for (const role of roles) {
    if (role.is_system || role.name.includes('Admin') || role.name.includes('Compras')) {
        console.log(`ID: ${role.id} | Name: ${role.name} | is_system: ${role.is_system} | Desc: ${role.description}`);
    }
  }
}
check();
