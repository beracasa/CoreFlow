const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
    const client = new Client({
        connectionString: 'postgresql://postgres:CoreFlowPassword2024!@db.eujtldssxdafrlhllnto.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to remote database.');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20260525183800_add_company_to_spare_parts.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        await client.query(sql);

        console.log('Migration successfully applied to remote database.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

run();
