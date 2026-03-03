import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    // The anon key doesn't have privileges to run ALTER TABLE.
    // If the user has a service_role key, we could use that.
    console.log("Checking for service role key...");
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.log("Service role key found!");
    } else {
        console.log("No service role key found. We cannot execute raw SQL directly from the client without an RPC function.");
    }
}

applyMigration().catch(console.error);
