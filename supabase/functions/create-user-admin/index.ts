import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { Resend } from "https://esm.sh/resend@3.2.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserPayload {
  email: string;
  fullName: string;
  roleId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { email, fullName, roleId } = (await req.json()) as CreateUserPayload;

    // 1. Generar clave aleatoria (CF-XXXXX)
    const randomStats = Math.random().toString(36).substring(2, 7).toUpperCase();
    const tempPassword = `CF-${randomStats}`;

    console.log(`Creando usuario: ${email} con clave temporal: ${tempPassword}`);

    // 2. Crear usuario en Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: roleId }
    });

    if (authError) throw authError;

    // 3. Actualizar perfil para obligar cambio de clave
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ requires_password_change: true })
      .eq("id", authData.user.id);

    if (profileError) throw profileError;

    // 4. Enviar correo via Resend
    const { error: mailError } = await resend.emails.send({
      from: "CoreFlow <notifications@resend.dev>", // Cambiar por dominio verificado en prod
      to: [email],
      subject: "Bienvenido a CoreFlow - Tu Clave Provisional",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
          <h2 style="color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 10px;">¡Bienvenido a CoreFlow!</h2>
          <p>Hola <strong>${fullName}</strong>,</p>
          <p>Se ha creado tu cuenta en la plataforma de mantenimiento industrial CoreFlow.</p>
          <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1; margin: 20px 0; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Tu clave provisional de acceso es:</p>
            <p style="margin: 10px 0 0 0; font-family: monospace; font-size: 24px; font-weight: bold; color: #1e293b; letter-spacing: 2px;">${tempPassword}</p>
          </div>
          <p style="color: #ef4444; font-size: 14px; font-weight: bold;">⚠️ Por seguridad, el sistema te pedirá cambiar esta clave en tu primer inicio de sesión.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="https://core-flow.vercel.app" style="background-color: #1d4ed8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acceder a CoreFlow</a>
          </div>
          <p style="margin-top: 40px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">Este es un correo automático. Por favor no respondas a este mensaje.</p>
        </div>
      `,
    });

    if (mailError) console.error("Error enviando email:", mailError);

    return new Response(JSON.stringify({ success: true, user: authData.user }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error en create-user-admin:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
