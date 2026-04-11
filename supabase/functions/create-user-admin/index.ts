import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from "npm:resend"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, fullName, roleId, jobTitle, companyCode, specialties } = await req.json()
    
    // Get caller's token to securely resolve their tenant
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No Authorization header provided');
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Securely identify the caller's tenant_id directly from the database
    const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (callerError || !callerUser) throw new Error('Invalid caller token');

    const { data: callerProfile } = await supabaseAdmin.from('profiles').select('tenant_id').eq('id', callerUser.id).single();
    const finalTenantId = callerProfile?.tenant_id || 'primary';

    const generatedPassword = 'CF-' + Math.random().toString(36).slice(-6).toUpperCase();

    // 1. Crear el usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role_id: roleId }
    });
    if (authError) throw authError;

    // 2. UPSERT explícito y obligatorio en public.profiles usando el tenant id validado
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authData.user.id,
      email: email,
      full_name: fullName,
      role_id: roleId,
      job_title: jobTitle || '',
      company_code: companyCode || '',
      specialties: specialties || [],
      tenant_id: finalTenantId,
      status: 'ACTIVE', 
      requires_password_change: true
    });

    if (profileError) {
      console.error("Error al crear el perfil público:", profileError);
      throw new Error("Usuario autenticado creado, pero falló la creación del perfil: " + profileError.message);
    }

    // Enviar correo con Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    await resend.emails.send({
      from: 'CoreFlow <notificaciones@ravicaribeinc.com>',
      to: email,
      subject: 'Bienvenido a CoreFlow Maintenance Cloud',
      html: `<div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc;">
              <h2 style="color: #1d4ed8;">CoreFlow Maintenance Cloud</h2>
              <p>Hola ${fullName}, has sido invitado a la plataforma.</p>
              <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p><strong>Correo:</strong> ${email}</p>
                <p><strong>Clave Provisional:</strong> ${generatedPassword}</p>
              </div>
              <p><small>Por seguridad, el sistema te pedirá cambiar esta clave al iniciar sesión por primera vez.</small></p>
             </div>`
    });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
