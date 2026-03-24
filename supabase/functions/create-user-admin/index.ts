import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { Resend } from "npm:resend"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Manejo OBLIGATORIO de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, fullName, roleId } = await req.json()
    console.log("--- INICIO DE PROCESAMIENTO ---");
    console.log("Intentando crear usuario:", email);

    // 2. Cliente Admin Seguro
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Generar clave
    const generatedPassword = 'CF-' + Math.random().toString(36).slice(-6).toUpperCase();
    console.log("Clave generada:", generatedPassword);

    // 4. Crear Usuario en Auth (Directamente Confirmado)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role_id: roleId }
    })

    if (authError) throw authError;

    // 5. Actualizar Perfil (Forzar cambio de clave y Estatus Invitado)
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          requires_password_change: true,
          status: 'INVITED'
        })
        .eq('id', authData.user.id);
      
      if (profileError) {
        console.warn("Aviso: No se pudo actualizar requires_password_change en profiles:", profileError.message);
      }
    }

    // 6. Enviar Correo con Resend (Estética Corporativa CoreFlow)
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    
    const htmlEmail = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; background-color: #f8fafc; margin: 0; padding: 40px; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
          .header { background-color: #1d4ed8; padding: 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 20px; }
          .content { padding: 40px; color: #334155; line-height: 1.6; }
          .welcome { font-size: 18px; font-weight: bold; color: #1e293b; }
          .box { background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0; }
          .label { color: #64748b; font-size: 14px; font-weight: bold; }
          .value { color: #1e293b; font-family: monospace; font-size: 16px; font-weight: bold; }
          .password { color: #1d4ed8; font-size: 20px; }
          .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; }
          .button { display: inline-block; background-color: #1d4ed8; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>CoreFlow Maintenance Cloud</h1></div>
          <div class="content">
            <p class="welcome">Hola ${fullName},</p>
            <p>Has sido invitado a la plataforma <strong>CoreFlow</strong>. Usa las siguientes credenciales para tu primer acceso:</p>
            <div class="box">
              <p><span class="label">Correo:</span> <span class="value">${email}</span></p>
              <p><span class="label">Clave Provisional:</span> <span class="value password">${generatedPassword}</span></p>
            </div>
            <p style="color: #64748b; font-size: 13px;">⚠️ Por seguridad, el sistema te pedirá cambiar esta clave al iniciar sesión por primera vez.</p>
            <div style="text-align: center;">
              <a href="https://core-flow.vercel.app" class="button">Acceder a CoreFlow</a>
            </div>
          </div>
          <div class="footer">CoreFlow Industrial Solutions &copy; 2026</div>
        </div>
      </body>
      </html>
    `;

    let emailSent = false;
    let emailErrorMsg = null;

    try {
      const emailResponse = await resend.emails.send({
        from: 'CoreFlow <onboarding@resend.dev>', // TODO: Cambiar a admin@ravicaribe.com cuando se verifique
        to: email,
        subject: 'Bienvenido a CoreFlow Maintenance Cloud',
        html: htmlEmail
      });
      
      if (emailResponse.error) {
        console.warn("Advertencia de Resend:", emailResponse.error);
        emailErrorMsg = emailResponse.error.message;
      } else {
        emailSent = true;
      }
    } catch (e: any) {
      console.warn("Fallo al enviar correo con Resend:", e);
      emailErrorMsg = e.message;
    }

    console.log("--- PROCESAMIENTO EXITOSO ---");
    return new Response(JSON.stringify({ 
      success: true, 
      user: authData.user,
      emailSent,
      warning: emailErrorMsg
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error("ERROR CRÍTICO:", error.message);
    // Retornamos 200 para que supabase-js no se trague el body con su FunctionsHttpError genérico.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
