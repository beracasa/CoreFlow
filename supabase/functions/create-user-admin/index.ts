import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from "npm:resend"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Manejo de CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, fullName, roleId, jobTitle, companyCode, specialties, tenantId } = await req.json()

    // Validate required fields
    if (!email || !fullName || !roleId) {
      throw new Error('Faltan campos requeridos: email, fullName, roleId');
    }

    // Use service role key — this is the security layer, no user token needed
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const generatedPassword = 'CF-' + Math.random().toString(36).slice(-6).toUpperCase();

    // 1. Crear el usuario en Auth
    // Pasamos TODOS los campos en user_metadata para que el trigger los pueda usar
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role_id: roleId,
        job_title: jobTitle || '',
        company_code: companyCode || '',
        specialties: specialties || [],
        tenant_id: tenantId || 'primary'
      }
    });

    if (authError) {
      const errDetail = {
        msg: authError.message,
        code: (authError as any).status || (authError as any).code || 'unknown',
        supabaseUrl: Deno.env.get('SUPABASE_URL')?.substring(0, 30) || 'NOT_SET',
        hasServiceKey: !!(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
      };
      console.error("Auth error details:", JSON.stringify(errDetail));
      throw new Error("AUTH_ERROR: " + authError.message + " | debug: " + JSON.stringify(errDetail));
    }

    console.log("Auth user created:", authData.user.id);

    // 2. UPSERT explícito en public.profiles
    const profilePayload = {
      id: authData.user.id,
      email: email,
      full_name: fullName,
      role_id: roleId,
      job_title: jobTitle || '',
      company_code: companyCode || '',
      specialties: specialties || [],
      tenant_id: tenantId || 'primary',
      status: 'ACTIVE',
      requires_password_change: true
    };

    console.log("Upserting profile:", JSON.stringify(profilePayload));

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(profilePayload)
      .select();

    if (profileError) {
      console.error("Error upserting profile:", JSON.stringify(profileError));
      throw new Error("Perfil fallido: " + profileError.message + " | code: " + profileError.code);
    }

    console.log("Profile upserted successfully:", JSON.stringify(profileData));

    // 3. Enviar correo con Resend
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const resend = new Resend(resendKey);
      const { error: emailError } = await resend.emails.send({
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

      if (emailError) {
        console.error("Email error (non-fatal):", emailError);
        // Email failure is non-fatal — user was created successfully
        return new Response(
          JSON.stringify({ success: true, emailSent: false, warning: emailError.message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: true, emailSent: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Edge function error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
