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

    if (!record) {
      return new Response(JSON.stringify({ error: "Missing record in payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Activation Filter: Only for R-MANT-02 (Preventivo) or R-MANT-05 (Correctivo)
    const isRMant02 = record.form_type === 'R-MANT-02' || record.type === 'PREVENTIVE';
    const isRMant05 = record.form_type === 'R-MANT-05' || record.type === 'CORRECTIVE';

    if (!isRMant02 && !isRMant05) {
      return new Response(JSON.stringify({ message: "Skipping: Neither R-MANT-02 nor R-MANT-05" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Draft Filter: Do not send email notifications for draft work orders
    if (record.current_stage === 'DRAFT') {
      return new Response(JSON.stringify({ message: "Skipping: Order is in DRAFT stage" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const formCode = isRMant02 ? 'R-MANT-02' : 'R-MANT-05';
    const formTitle = isRMant02 ? 'Mantenimiento Preventivo (R-MANT-02)' : 'Solicitud de Mantenimiento Correctivo (R-MANT-05)';
    const prefKey = isRMant02 ? 'alerts_rmant02' : 'alerts_rmant05';
    const accentColor = isRMant02 ? '#059669' : '#dc2626'; // Emerald for preventive, Red/Amber for corrective

    console.log(`--- PROCESANDO NOTIFICACIÓN ${formCode}: ${record.display_id || record.id} ---`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Query Subscribers configured in Notification Preferences
    const { data: subscribers, error: subscriberError } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .filter(`notification_preferences->>${prefKey}`, 'eq', 'true');

    if (subscriberError) throw subscriberError;

    const emailSet = new Set<string>();
    (subscribers || []).forEach(s => {
      if (s.email && s.email.trim()) {
        emailSet.add(s.email.trim().toLowerCase());
      }
    });

    // Also include assigned mechanic / technician if specified
    let assignedMechanicName = 'No asignado';
    if (record.assigned_mechanic) {
      const { data: mechanic } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .or(`id.eq.${record.assigned_mechanic},full_name.eq.${record.assigned_mechanic}`)
        .maybeSingle();

      if (mechanic) {
        assignedMechanicName = mechanic.full_name || record.assigned_mechanic;
        if (mechanic.email && mechanic.email.trim()) {
          emailSet.add(mechanic.email.trim().toLowerCase());
        }
      } else {
        assignedMechanicName = record.assigned_mechanic;
      }
    }

    const recipientEmails = Array.from(emailSet);

    if (recipientEmails.length === 0) {
      console.log(`No hay usuarios suscritos ni personal asignado para alertas ${formCode}.`);
      return new Response(JSON.stringify({ 
        message: `No subscribers or assigned mechanic found for ${formCode}`,
        formCode 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Destinatarios para ${formCode}:`, recipientEmails);

    // 4. HTML Template for Email
    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://coreflow-six.vercel.app';
    const orderUrl = record.id ? `${appUrl}/orders/${record.id}` : appUrl;
    const displayId = record.display_id || record.id || 'N/A';
    const branchName = record.branch || 'Planta Principal';
    
    const subject = isRMant02
      ? `🛠️ Nuevo Mantenimiento Preventivo [${displayId}] - ${branchName}`
      : `🚨 Nueva Solicitud de Mantenimiento Correctivo [${displayId}] - ${branchName}`;

    const priorityBadge = record.condition || record.priority || 'Normal';
    const equipmentName = record.title || record.machine_name || 'Equipo no especificado';
    const descriptionText = record.request_description || record.description || 'Sin descripción detallada';

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #334155; }
          .wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 4px solid ${accentColor}; }
          .header-brand { color: #f8fafc; font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
          .header-sub { color: #94a3b8; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
          .body-content { padding: 32px 28px; }
          .badge-type { display: inline-block; background-color: ${accentColor}15; color: ${accentColor}; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 20px; border: 1px solid ${accentColor}40; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
          .subtitle { font-size: 14px; color: #64748b; margin: 0 0 24px 0; }
          .info-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .info-table th { background-color: #f8fafc; color: #475569; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 12px 16px; text-align: left; width: 38%; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
          .info-table td { padding: 12px 16px; font-size: 14px; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
          .info-table tr:last-child th, .info-table tr:last-child td { border-bottom: none; }
          .desc-box { background-color: #f8fafc; border-left: 4px solid ${accentColor}; padding: 16px; border-radius: 4px; margin-bottom: 28px; font-size: 14px; color: #334155; line-height: 1.6; }
          .btn-container { text-align: center; margin: 32px 0 16px 0; }
          .btn { background-color: ${accentColor}; color: #ffffff !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 12px ${accentColor}40; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <h1 class="header-brand">COREFLOW</h1>
            <div class="header-sub">Sistema de Mantenimiento Industrial</div>
          </div>
          <div class="body-content">
            <span class="badge-type">${formTitle}</span>
            <h2 class="title">Nueva Solicitud de Mantenimiento</h2>
            <p class="subtitle">Se ha registrado una nueva orden de trabajo en el sistema y se te ha notificado según tus preferencias.</p>
            
            <table class="info-table">
              <tr>
                <th>Código de Orden</th>
                <td><strong style="color: #0f172a; font-size: 15px;">${displayId}</strong></td>
              </tr>
              <tr>
                <th>Tipo de Orden</th>
                <td>${isRMant02 ? 'Preventivo Programado' : 'Correctivo / Reparación de Falla'}</td>
              </tr>
              <tr>
                <th>Equipo / Máquina</th>
                <td><strong>${equipmentName}</strong></td>
              </tr>
              <tr>
                <th>Prioridad / Condición</th>
                <td><span style="font-weight: 600; color: ${priorityBadge.toLowerCase().includes('urgente') || priorityBadge.toLowerCase().includes('alta') ? '#dc2626' : '#2563eb'};">${priorityBadge}</span></td>
              </tr>
              <tr>
                <th>Planta / Sucursal</th>
                <td>${branchName}</td>
              </tr>
              <tr>
                <th>Técnico Asignado</th>
                <td>${assignedMechanicName}</td>
              </tr>
            </table>

            <div style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">Detalles de la Solicitud</div>
            <div class="desc-box">
              ${descriptionText.replace(/\n/g, '<br/>')}
            </div>

            <div class="btn-container">
              <a href="${orderUrl}" class="btn" target="_blank">Abrir Orden en CoreFlow &rarr;</a>
            </div>
          </div>
          <div class="footer">
            Este es un correo automático generado por el Sistema CoreFlow.<br/>
            &copy; 2026 CoreFlow Industrial Systems. Todos los derechos reservados.
          </div>
        </div>
      </body>
      </html>
    `;

    // 5. Send with Resend using verified domain: notificaciones@ravicaribeinc.com
    const sender = 'CoreFlow <notificaciones@ravicaribeinc.com>';

    const sendPromises = recipientEmails.map(async (toEmail) => {
      try {
        const { data, error } = await resend.emails.send({
          from: sender,
          to: toEmail,
          subject,
          html,
        });
        if (error) {
          console.error(`Error enviando a ${toEmail}:`, error);
          return { email: toEmail, success: false, error };
        }
        return { email: toEmail, success: true, id: data?.id };
      } catch (err: any) {
        console.error(`Excepción enviando a ${toEmail}:`, err.message);
        return { email: toEmail, success: false, error: err.message };
      }
    });

    const sendResults = await Promise.all(sendPromises);
    const successfulSends = sendResults.filter(r => r.success);

    console.log(`Resultado envío ${formCode} [${displayId}]: ${successfulSends.length}/${recipientEmails.length} entregados`);

    return new Response(JSON.stringify({ 
      success: true, 
      formCode,
      displayId,
      totalRecipients: recipientEmails.length,
      delivered: successfulSends.length,
      results: sendResults
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error crítico en envío de notificación:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
