import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "npm:resend@3.2.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { table, record } = payload;

    // 1. Activation Filter: Only for R-MANT-05
    if (record.form_type !== 'R-MANT-05') {
      return new Response(JSON.stringify({ message: "Skipping: Not a R-MANT-05 form" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`--- PROCESANDO NOTIFICACIÓN R-MANT-05: ${record.display_id} ---`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Real Subscriber Logic
    const { data: subscribers, error: subscriberError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .filter('notification_preferences->>alerts_rmant05', 'eq', 'true');

    if (subscriberError) throw subscriberError;

    const recipientEmails = subscribers?.map(s => s.email).filter(Boolean) || [];

    if (recipientEmails.length === 0) {
      console.log("No hay usuarios suscritos para alertas R-MANT-05.");
      return new Response(JSON.stringify({ message: "No subscribers found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 3. Professional HTML Design (Industrial)
    const appUrl = 'http://localhost:3000'; // Base URL for local testing
    const subject = `🚨 Nueva Solicitud de Mantenimiento R-MANT-05 ${record.display_id} - ${record.branch}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 600px; background-color: #ffffff; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
          .header { background-color: #1d4ed8; padding: 24px; text-align: center; }
          .header h1 { color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px; }
          .content { padding: 32px; }
          .alert-title { color: #1d4ed8; font-size: 18px; font-weight: bold; margin-bottom: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { text-align: left; padding: 12px; background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-transform: uppercase; width: 35%; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155; }
          .button-container { text-align: center; margin-top: 32px; }
          .button { background-color: #1d4ed8; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block; transition: background-color 0.2s; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>COREFLOW MAINTENANCE</h1>
          </div>
          <div class="content">
            <div class="alert-title">Nueva Solicitud de Mantenimiento</div>
            <table>
              <tr><th>ID de Orden</th><td>${record.display_id}</td></tr>
              <tr><th>Equipo</th><td>${record.title}</td></tr>
              <tr><th>Prioridad</th><td>${record.priority}</td></tr>
              <tr><th>Tipo de Falla</th><td>${record.failure_type}</td></tr>
              <tr><th>Descripción</th><td>${record.request_description || 'Sin descripción detallada'}</td></tr>
            </table>
            <div class="button-container">
              <a href="${appUrl}" class="button">Ver en CoreFlow</a>
            </div>
          </div>
          <div class="footer">
            © 2026 CoreFlow Industrial Systems. Notificación Automática.
          </div>
        </div>
      </body>
      </html>
    `;

    // 4. Send with Resend
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'CoreFlow <onboarding@resend.dev>',
      to: recipientEmails,
      subject,
      html,
    });

    if (emailError) throw emailError;

    console.log(`Envío exitoso a ${recipientEmails.length} destinatarios. ID: ${emailData?.id}`);

    return new Response(JSON.stringify({ success: true, recipients: recipientEmails.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error en envío de notificación:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
