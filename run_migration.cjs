const { Client } = require('pg');
const fs = require('fs');

async function run() {
    const client = new Client({
        connectionString: 'postgresql://postgres.eujtldssxdafrlhllnto:CoreFlowPassword2024!@aws-0-us-west-1.pooler.supabase.com:6543/postgres',
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to remote database.');

        const sql = fs.readFileSync('supabase/migrations/20260224190500_create_spare_part_requests.sql', 'utf8');
        await client.query(sql);

        console.log('Migration successfully applied to remote database.');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

run();
