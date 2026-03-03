import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1. Manejo Explícito de CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 2. Responder al Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 4. Logging de Depuración inicial
    console.log(`[invite-user] Request received: ${req.method}`);
    
    // 5. Extraer campos del body
    const { email, fullName, roleId, tenantId } = await req.json();
    console.log(`[invite-user] Parsed payload - Email: ${email}, RoleID: ${roleId}, FullName: ${fullName}, TenantID: ${tenantId}`);

    if (!email || !fullName || !roleId) {
       console.warn("[invite-user] Missing required fields in payload");
       return new Response(JSON.stringify({ error: 'Missing required fields' }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 400,
       });
    }

    // 3. Instancia Admin Segura
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 5. Lógica de Invitación
    console.log(`[invite-user] Calling inviteUserByEmail for ${email}...`);
    // NOTE: The database trigger 'handle_new_user' expects 'role' and 'tenant_id' in metadata
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { 
        full_name: fullName, 
        role: roleId, // Changed from role_id to role to match handle_new_user trigger
        tenant_id: tenantId || 'primary'
      }
    });

    if (inviteError) {
      console.error("[invite-user] Error from Supabase Admin API:", inviteError);
      return new Response(JSON.stringify({ error: inviteError.message, details: inviteError }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    
    console.log(`[invite-user] Invitation sent successfully to ${email}. ID: ${inviteData?.user?.id}`);

    // Solo devolver los datos del usuario para el frontend
    return new Response(
      JSON.stringify({ message: "User invited successfully", user: inviteData.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    // 6. Respuesta de Error
    console.error("[invite-user] Unhandled Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
