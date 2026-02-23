const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars", { supabaseUrl, supabaseKey: !!supabaseKey });
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching profiles to check role values...");
  const { data, error } = await supabase.from('profiles').select('id, role').limit(5);
  console.log("Current Data:", data);
  if (error) console.error("Error:", error);
  
  if (data && data.length > 0) {
    const testId = data[0].id;
    console.log(`\nAttempting to update role to a random string for ID ${testId}`);
    const { data: updateData, error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'test_role_123' })
      .eq('id', testId)
      .select();
      
    console.log("Update Result:", updateData);
    if (updateError) {
       console.error("Update Error:", updateError);
       console.log("This means the column is likely an ENUM or has a constraint.");
    } else {
       console.log("Update succeeded! The column accepts text.");
       // Revert back
       await supabase.from('profiles').update({ role: data[0].role }).eq('id', testId);
    }
  }
}
check();
