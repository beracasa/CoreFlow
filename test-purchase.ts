import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
    const scNumber = `SC-DIR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const payload: any = {
        request_id: null,
        purchase_request_number: scNumber,
        items: [{ partId: '123', quantity: 10 }],
        request_date: new Date().toISOString()
    };
    
    // Auth might be needed but let's see the error first
    const { data, error } = await supabase.from('purchase_requests').insert(payload);
    
    if (error) {
        console.error('Insert Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Success:', data);
    }
}

main().catch(console.error);
