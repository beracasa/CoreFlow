import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';


console.log('✅ Script started');

async function verifyConnection() {
  try {
    console.log('📂 Reading .env.local...');
    // Read .env.local manually since we don't have dotenv
    const envPath = path.resolve(process.cwd(), '.env.local');
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
      return;
    }

    console.log(`Connecting to Supabase at ${supabaseUrl}...`);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { count, error } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Connection failed:', error.message);
    } else {
      console.log('✅ Connection successful!');
      console.log(`✅ Current work_orders count: ${count}`);
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

verifyConnection();
