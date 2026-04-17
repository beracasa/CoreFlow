import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

serve(async (req) => {
  const { email } = await req.json()
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .ilike('email', `%${email}%`)

  return new Response(JSON.stringify({ data, error }), { status: 200, headers: { 'Content-Type': 'application/json' } })
})
