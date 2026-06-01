const dns = require('dns');

dns.resolveAny('eujtldssxdafrlhllnto.supabase.co', (err, records) => {
    if (err) {
        console.error(err);
    } else {
        console.log('RECORDS:', JSON.stringify(records, null, 2));
    }
});
