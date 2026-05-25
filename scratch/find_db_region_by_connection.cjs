const { Client } = require('pg');

const regions = [
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'us-west-2',
    'eu-central-1',
    'eu-west-1',
    'eu-west-2',
    'eu-west-3',
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'ap-northeast-2',
    'sa-east-1',
    'ca-central-1',
    'me-central-1',
    'af-south-1'
];

async function check() {
    for (const r of regions) {
        const host = `aws-0-${r}.pooler.supabase.com`;
        const client = new Client({
            connectionString: `postgresql://postgres.eujtldssxdafrlhllnto:CoreFlowPassword2024!@${host}:6543/postgres`,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });

        try {
            await client.connect();
            console.log(`\n\n🎉 SUCCESSFUL CONNECTION TO REGION: ${r}\n\n`);
            await client.end();
            return;
        } catch (e) {
            const msg = e.message || '';
            if (msg.includes('Tenant or user not found')) {
                // Not this region
                // console.log(`Region ${r} returned Tenant or user not found.`);
            } else {
                console.log(`REGION ${r} returned different error:`, msg);
                // If it's authentication failed, that means the tenant WAS found but password was incorrect, or port blocked, etc.
            }
        }
    }
    console.log('Verification completed.');
}

check();
