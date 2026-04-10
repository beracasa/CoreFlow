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
    const { email, fullName, roleId } = await req.json()
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const generatedPassword = 'CF-' + Math.random().toString(36).slice(-6).toUpperCase();

    // Crear usuario confirmado
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role_id: roleId }
    })

    if (authError) throw authError;

    // Forzar cambio de clave
    await supabaseAdmin.from('profiles').update({ requires_password_change: true }).eq('id', authData.user.id);

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
