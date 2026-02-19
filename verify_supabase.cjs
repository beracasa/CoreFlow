const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('✅ Script started');

async function verifyConnection() {
  try {
    console.log('📂 Reading .env.local...');
    // Read .env.local manually since we don't have dotenv
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env.local not found!');
      return;
    }
    const envContent = fs.readFileSync(envPath, 'utf-8');

    const envVars = {};
    envContent.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        envVars[key] = value;
      }
    });

    const supabaseUrl = envVars['VITE_SUPABASE_URL'];
    const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase credentials in .env.local');
      console.log('Found keys:', Object.keys(envVars));
      return;
    }

    console.log(`Connecting to Supabase at ${supabaseUrl}...`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try a simple health check or public table query
    const { data, count, error } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection failed:', error.message);
      if (error.code) console.error('Error Code:', error.code);
    } else {
      console.log('✅ Connection successful!');
      console.log(`✅ Current work_orders count: ${count}`);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

verifyConnection();
