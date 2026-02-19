const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function checkCounts() {
    try {
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
            console.error('❌ Missing credentials');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        console.log(`Connecting to ${supabaseUrl}...`);

        const tables = ['machines', 'zones', 'technicians', 'spare_parts', 'work_orders', 'plant_settings'];

        for (const table of tables) {
            const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.error(`❌ ${table}: Error - ${error.message}`);
            } else {
                console.log(`✅ ${table}: ${count} rows`);
            }
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkCounts();
