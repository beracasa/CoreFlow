const dns = require('dns');

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
        try {
            await new Promise((resolve, reject) => {
                dns.resolve4(host, (err, addresses) => {
                    if (err) reject(err);
                    else resolve(addresses);
                });
            });
            console.log(`FOUND RESOLVING REGION: ${r} (${host})`);
        } catch (e) {
            // Not in this region
        }
    }
    console.log('Verification completed.');
}

check();
