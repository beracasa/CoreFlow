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

    // Check if this is a Low Stock (Bajo Stock) alert for spare_parts
    const isLowStockAlert = table === 'spare_parts' || 
                            payload.event === 'low_stock' || 
                            (record.sku !== undefined && record.current_stock !== undefined && !record.form_type);

    if (isLowStockAlert) {
      const currentStock = Number(record.current_stock ?? 0);
      const minStock = Number(record.minimum_stock ?? 0);
      const partSku = record.sku || 'S/C';
      const partName = record.name || 'Repuesto sin especificar';
      const companyName = record.company || 'CoreFlow';
      const unit = record.unit_of_measure || 'Unidad';

      console.log(`--- PROCESANDO NOTIFICACIÓN BAJO STOCK: [${partSku}] ${partName} - Stock: ${currentStock} / Mín: ${minStock} ---`);

      // 1. Safety verification: only notify if stock is at or below minimum
      if (currentStock > minStock) {
        return new Response(JSON.stringify({ 
          message: "Skipping: Part current stock is above minimum",
          currentStock,
          minStock
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // 2. Query subscribers with notification preference 'low_stock' = true
      const { data: subscribers, error: subscriberError } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .filter('notification_preferences->>low_stock', 'eq', 'true');

      if (subscriberError) throw subscriberError;

      const emailSet = new Set<string>();
      (subscribers || []).forEach(s => {
        if (s.email && s.email.trim()) {
          emailSet.add(s.email.trim().toLowerCase());
        }
      });

      const recipientEmails = Array.from(emailSet);

      if (recipientEmails.length === 0) {
        console.log(`No hay usuarios suscritos para alertas de Bajo Stock.`);
        return new Response(JSON.stringify({ 
          message: "No subscribers found for low_stock",
          sku: partSku 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      console.log(`Destinatarios para Bajo Stock [${partSku}]:`, recipientEmails);

      // 3. Low Stock HTML Email Template
      const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://coreflow-six.vercel.app';
      const inventoryUrl = `${appUrl}/inventory`;
      const subject = `⚠️ Alerta de Bajo Stock: ${partName} [${partSku}] - ${companyName}`;
      const accentColor = '#ea580c'; // Vibrant Industrial Orange

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
            .desc-box { background-color: #fff7ed; border-left: 4px solid ${accentColor}; padding: 16px; border-radius: 4px; margin-bottom: 28px; font-size: 14px; color: #9a3412; line-height: 1.6; }
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
              <span class="badge-type">📦 ALERTA DE INVENTARIO • BAJO STOCK</span>
              <h2 class="title">Repuesto en Nivel Crítico de Stock</h2>
              <p class="subtitle">Se ha detectado que el siguiente repuesto ha alcanzado o caído por debajo de su nivel de stock de seguridad.</p>
              
              <table class="info-table">
                <tr>
                  <th>Código / SKU</th>
                  <td><strong style="color: #0f172a; font-size: 15px;">${partSku}</strong></td>
                </tr>
                <tr>
                  <th>Nombre del Repuesto</th>
                  <td><strong>${partName}</strong></td>
                </tr>
                <tr>
                  <th>Stock Actual</th>
                  <td>
                    <span style="display: inline-block; background-color: #fee2e2; color: #b91c1c; font-weight: 800; font-size: 15px; padding: 3px 10px; border-radius: 6px; border: 1px solid #fca5a5;">
                      ${currentStock} ${unit}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>Stock Mínimo</th>
                  <td><strong style="color: #334155;">${minStock} ${unit}</strong></td>
                </tr>
                ${record.maximum_stock ? `
                <tr>
                  <th>Stock Máximo</th>
                  <td>${record.maximum_stock} ${unit}</td>
                </tr>` : ''}
                <tr>
                  <th>Empresa / Planta</th>
                  <td>${companyName}</td>
                </tr>
                <tr>
                  <th>Ubicación / Tramo</th>
                  <td>${record.location_code || 'No asignada'}${record.sub_location ? ` (${record.sub_location})` : ''}</td>
                </tr>
                ${record.category ? `
                <tr>
                  <th>Categoría</th>
                  <td>${record.category}</td>
                </tr>` : ''}
                ${record.supplier ? `
                <tr>
                  <th>Proveedor</th>
                  <td>${record.supplier}</td>
                </tr>` : ''}
                ${(record.machine_name || record.machine_plate) ? `
                <tr>
                  <th>Equipo Asociado</th>
                  <td>${record.machine_name || ''} ${record.machine_plate ? `[${record.machine_plate}]` : ''}</td>
                </tr>` : ''}
              </table>

              <div class="desc-box">
                <strong>⚠️ Acción requerida:</strong> Se requiere revisar la disponibilidad física en almacén e iniciar una solicitud de reposición o compra para evitar retrasos o desabastecimiento en futuras intervenciones.
              </div>

              <div class="btn-container">
                <a href="${inventoryUrl}" class="btn" target="_blank">Abrir Inventario en CoreFlow &rarr;</a>
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

      // 4. Send with Resend using verified domain: notificaciones@ravicaribeinc.com
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
            console.error(`Error enviando Bajo Stock a ${toEmail}:`, error);
            return { email: toEmail, success: false, error };
          }
          return { email: toEmail, success: true, id: data?.id };
        } catch (err: any) {
          console.error(`Excepción enviando Bajo Stock a ${toEmail}:`, err.message);
          return { email: toEmail, success: false, error: err.message };
        }
      });

      const sendResults = await Promise.all(sendPromises);
      const successfulSends = sendResults.filter(r => r.success);

      console.log(`Resultado envío Bajo Stock [${partSku}]: ${successfulSends.length}/${recipientEmails.length} entregados`);

      return new Response(JSON.stringify({ 
        success: true, 
        event: 'low_stock',
        sku: partSku,
        currentStock,
        minStock,
        totalRecipients: recipientEmails.length,
        delivered: successfulSends.length,
        results: sendResults
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // -------------------------------------------------------------
    // WORK ORDERS LOGIC (R-MANT-02 Preventivo / R-MANT-05 Correctivo)
    // -------------------------------------------------------------

    // 1. Activation Filter: Only for R-MANT-02 (Preventivo) or R-MANT-05 (Correctivo)
    const isRMant02 = record.form_type === 'R-MANT-02' || record.type === 'PREVENTIVE';
    const isRMant05 = record.form_type === 'R-MANT-05' || record.type === 'CORRECTIVE';

    if (!isRMant02 && !isRMant05) {
      return new Response(JSON.stringify({ message: "Skipping: Neither R-MANT-02 nor R-MANT-05 nor low_stock" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const isClosed = payload.event === 'work_order_closed' || record.current_stage === 'CLOSED';
    const isRequested = payload.event === 'work_order_requested' || record.current_stage === 'REQUESTED';

    // 2. Draft / In-progress Filter: Do not send email notifications unless order is CLOSED or REQUESTED
    if (!isClosed && !isRequested) {
      return new Response(JSON.stringify({ 
        message: `Skipping: Stage ${record.current_stage} does not trigger notification`,
        currentStage: record.current_stage 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const formCode = isRMant02 ? 'R-MANT-02' : 'R-MANT-05';
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const sender = 'CoreFlow <notificaciones@ravicaribeinc.com>';
    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://coreflow-six.vercel.app';
    const orderUrl = record.id ? `${appUrl}/orders/${record.id}` : appUrl;
    const displayId = record.display_id || record.id || 'N/A';

    // =============================================================
    // CASE A: CIERRE DE MANTENIMIENTO (Paso 3 Cierre y Entrega)
    // =============================================================
    if (isClosed) {
      const formTitle = isRMant02 ? 'Mantenimiento Preventivo (R-MANT-02)' : 'Mantenimiento Correctivo (R-MANT-05)';
      const accentColor = '#059669'; // Emerald for completion / conformity

      console.log(`--- PROCESANDO NOTIFICACIÓN CIERRE DE MANTENIMIENTO ${formCode}: ${displayId} ---`);

      // 1. Query Subscribers with preference 'pending_approvals' = true (Cierre Mantenimientos)
      const { data: subscribers, error: subscriberError } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .filter('notification_preferences->>pending_approvals', 'eq', 'true');

      if (subscriberError) throw subscriberError;

      const emailSet = new Set<string>();
      (subscribers || []).forEach(s => {
        if (s.email && s.email.trim()) {
          emailSet.add(s.email.trim().toLowerCase());
        }
      });

      const recipientEmails = Array.from(emailSet);

      if (recipientEmails.length === 0) {
        console.log(`No hay usuarios suscritos para Cierre Mantenimientos (pending_approvals).`);
        return new Response(JSON.stringify({ 
          message: "No subscribers found for pending_approvals (Cierre Mantenimientos)",
          formCode,
          displayId 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      console.log(`Destinatarios para Cierre ${formCode} [${displayId}]:`, recipientEmails);

      // 2. Gather additional relevant machine and personnel data
      let equipmentName = record.title || 'Equipo no especificado';
      let machineCode = record.machine_plate || '';
      let branchName = record.branch || 'Planta Principal';

      if (record.machine_id) {
        const { data: machine } = await supabaseAdmin
          .from('machines')
          .select('name, code, branch, brand, model')
          .eq('id', record.machine_id)
          .maybeSingle();

        if (machine) {
          equipmentName = machine.name || equipmentName;
          machineCode = machine.code || machineCode;
          if (machine.branch) branchName = machine.branch;
        }
      }

      // Supervisor who received and signed closure (Paso 3)
      let supervisorName = record.signature_supervisor || 'Supervisor de Planta';
      if (record.supervisor_id) {
        const { data: supervisor } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('id', record.supervisor_id)
          .maybeSingle();

        if (supervisor?.full_name) {
          supervisorName = supervisor.full_name;
        }
      }

      // Assigned mechanic / executor
      let assignedMechanicName = record.signature_executor || 'No asignado';
      if (record.assigned_mechanic) {
        const { data: mechanic } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .or(`id.eq.${record.assigned_mechanic},full_name.eq.${record.assigned_mechanic}`)
          .maybeSingle();

        if (mechanic?.full_name) {
          assignedMechanicName = mechanic.full_name;
        } else {
          assignedMechanicName = record.assigned_mechanic;
        }
      }

      // Execution supervisor (Paso 2)
      const checklist = (record.checklist && typeof record.checklist === 'object') ? record.checklist : {};
      const execSupervisorName = record.signature_execution_supervisor ||
        checklist._executionSupervisorSignature ||
        'Supervisión de Turno';

      // Date formatters
      const formatDateTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'N/A';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleString('es-DO', {
          timeZone: 'America/Santo_Domingo',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      };

      const closingDateFormatted = formatDateTime(record.closing_date || record.completed_date || new Date().toISOString());
      const interventionPeriod = (record.start_date || record.end_date)
        ? `${record.start_date || ''} ${record.start_time || ''} al ${record.end_date || ''} ${record.end_time || ''}`.trim()
        : 'Registrado en orden';

      // Preventive tasks for R-MANT-02
      const tasks = Array.isArray(record.tasks) ? record.tasks : [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t: any) => t.completed || t.status === 'DONE').length;
      const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

      // Consumed Parts
      const consumedParts = Array.isArray(record.consumed_parts) ? record.consumed_parts : [];
      let partsHtml = '';
      if (consumedParts.length > 0) {
        const partsRows = consumedParts.map((p: any) => {
          const qty = p.quantity ?? p.qty ?? 1;
          const unit = p.unit || 'und';
          const cost = Number(p.totalCost || (p.cost ? Number(p.cost) * Number(qty) : 0)).toFixed(2);
          return `
            <tr>
              <td style="padding: 10px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #f1f5f9;">
                <strong>${p.name || p.partName || 'Repuesto'}</strong>
                ${(p.code || p.partNumber || p.sku) ? `<br/><span style="color: #64748b; font-size: 11px;">SKU: ${p.code || p.partNumber || p.sku}</span>` : ''}
              </td>
              <td style="padding: 10px 14px; font-size: 13px; color: #334155; text-align: center; border-bottom: 1px solid #f1f5f9;">
                ${qty} ${unit}
              </td>
              <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; text-align: right; font-weight: 600; border-bottom: 1px solid #f1f5f9;">
                $${cost}
              </td>
            </tr>
          `;
        }).join('');

        partsHtml = `
          <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: left; border-bottom: 1px solid #e2e8f0;">Repuesto / Insumo</th>
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: center; border-bottom: 1px solid #e2e8f0;">Cant.</th>
                <th style="padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #64748b; text-align: right; border-bottom: 1px solid #e2e8f0;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${partsRows}
              <tr style="background-color: #f8fafc;">
                <td colspan="2" style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #0f172a; text-align: right;">Costo Total Mantenimiento:</td>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #059669; text-align: right;">$${Number(record.total_maintenance_cost || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        `;
      } else {
        partsHtml = `
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px 16px; border-radius: 8px; font-size: 13px; color: #64748b; text-align: center; margin-bottom: 20px;">
            Sin consumo de repuestos de almacén registrado ($0.00).
          </div>
        `;
      }

      // Handover Checklist entries (Paso 3 Cierre y Entrega)
      const checklistEntries = [
        { label: 'Punto específico de intervención limpio libre de contaminantes', val: checklist.pointClean },
        { label: 'Área o punto de intervención limpio', val: checklist.areaClean },
        { label: 'Protecciones y guardas de máquinas completas', val: checklist.guardsComplete },
        { label: 'Herramientas y accesorios retirados del área', val: checklist.toolsRemoved },
        { label: 'Grasas o aceites devueltos al lugar asignado', val: checklist.greaseCleaned },
        { label: 'Protecciones de seguridad activadas', val: checklist.safetyActivated },
      ];

      const checklistRows = checklistEntries.map(item => `
        <tr>
          <td style="padding: 8px 12px; font-size: 12px; color: #334155; border-bottom: 1px solid #f1f5f9;">
            ${item.val === true ? '<span style="color: #059669; font-weight: bold; margin-right: 6px;">✓</span>' : '<span style="color: #64748b; margin-right: 6px;">•</span>'}
            ${item.label}
          </td>
          <td style="padding: 8px 12px; font-size: 12px; text-align: right; font-weight: 700; border-bottom: 1px solid #f1f5f9; color: ${item.val === true ? '#059669' : '#64748b'};">
            ${item.val === true ? 'Conforme' : 'N/A'}
          </td>
        </tr>
      `).join('');

      const subject = `✅ Cierre de Mantenimiento [${displayId}] - ${equipmentName} (${branchName})`;

      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 24px; color: #334155; }
            .wrapper { max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); border: 1px solid #e2e8f0; }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; border-bottom: 4px solid ${accentColor}; }
            .header-brand { color: #f8fafc; font-size: 22px; font-weight: 800; letter-spacing: 2px; margin: 0; text-transform: uppercase; }
            .header-sub { color: #94a3b8; font-size: 11px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
            .body-content { padding: 32px 28px; }
            .badge-type { display: inline-block; background-color: #ecfdf5; color: #047857; font-weight: 700; font-size: 12px; padding: 6px 14px; border-radius: 20px; border: 1px solid #a7f3d0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 16px; }
            .title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; }
            .subtitle { font-size: 14px; color: #64748b; margin: 0 0 24px 0; line-height: 1.5; }
            .info-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .info-table th { background-color: #f8fafc; color: #475569; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 11px 14px; text-align: left; width: 38%; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; }
            .info-table td { padding: 11px 14px; font-size: 13px; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
            .info-table tr:last-child th, .info-table tr:last-child td { border-bottom: none; }
            .section-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
            .desc-box { background-color: #f8fafc; border-left: 4px solid ${accentColor}; padding: 16px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #334155; line-height: 1.6; }
            .signatures-table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .signatures-table th { background-color: #f8fafc; padding: 10px 14px; font-size: 11px; text-transform: uppercase; color: #475569; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .signatures-table td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
            .signatures-table tr:last-child td { border-bottom: none; }
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
              <span class="badge-type">✅ CIERRE FORMAL • ${formTitle}</span>
              <h2 class="title">Mantenimiento Finalizado y Conforme</h2>
              <p class="subtitle">La orden de trabajo <strong>${displayId}</strong> ha sido completada formalmente y aceptada en el tercer paso de <strong>Cierre y Entrega</strong>.</p>
              
              <table class="info-table">
                <tr>
                  <th>Código de Orden</th>
                  <td><strong style="color: #059669; font-size: 15px;">${displayId}</strong></td>
                </tr>
                <tr>
                  <th>Tipo de Orden</th>
                  <td>${isRMant02 ? 'Preventivo Programado' : 'Correctivo / Reparación de Falla'}</td>
                </tr>
                <tr>
                  <th>Equipo / Máquina</th>
                  <td><strong>${equipmentName}</strong> ${machineCode ? `[${machineCode}]` : ''}</td>
                </tr>
                <tr>
                  <th>Planta / Sucursal</th>
                  <td>${branchName}</td>
                </tr>
                <tr>
                  <th>Fecha y Hora de Cierre</th>
                  <td><strong>${closingDateFormatted}</strong></td>
                </tr>
                <tr>
                  <th>Periodo de Intervención</th>
                  <td>${interventionPeriod}</td>
                </tr>
                ${isRMant02 ? `
                <tr>
                  <th>Frecuencia / Intervalo</th>
                  <td>${record.interval_name || 'N/A'}</td>
                </tr>
                <tr>
                  <th>Horas Máquina al Mantenimiento</th>
                  <td>${record.machine_work_hours ? `${record.machine_work_hours} hrs` : 'N/A'}</td>
                </tr>
                <tr>
                  <th>Próximo Mantenimiento</th>
                  <td>${record.next_maintenance_hours ? `${record.next_maintenance_hours} hrs` : 'N/A'}</td>
                </tr>
                <tr>
                  <th>Tareas de Rutina</th>
                  <td><strong style="color: #059669;">${completedTasks} de ${totalTasks} ejecutadas (${taskPct}%)</strong></td>
                </tr>
                ` : `
                <tr>
                  <th>Tipo de Falla</th>
                  <td>${record.failure_type || 'No especificada'}</td>
                </tr>
                <tr>
                  <th>Condición / Prioridad</th>
                  <td>${record.condition || record.priority || 'Normal'}</td>
                </tr>
                ${record.frequency ? `
                <tr>
                  <th>Frecuencia de Falla</th>
                  <td>${record.frequency}</td>
                </tr>` : ''}
                `}
              </table>

              ${isRMant05 ? `
              <div class="section-title">Detalle del Reporte y Trabajo Correctivo</div>
              <div class="desc-box">
                <p style="margin: 0 0 10px 0;"><strong>Falla / Solicitud Reportada:</strong><br/>${(record.request_description || record.description || 'Sin descripción').replace(/\n/g, '<br/>')}</p>
                <p style="margin: 0;"><strong>Acción Correctiva Ejecutada:</strong><br/>${(record.action_taken || 'Intervención completada según protocolo').replace(/\n/g, '<br/>')}</p>
              </div>
              ` : ''}

              <div class="section-title">Verificación de Cierre y Entrega (Checklist Paso 3)</div>
              <table style="width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                ${checklistRows}
              </table>

              <div class="section-title">Repuestos y Materiales Consumidos</div>
              ${partsHtml}

              <div class="section-title">Responsables y Firmas de Aprobación</div>
              <table class="signatures-table">
                <tr>
                  <th>Rol</th>
                  <th>Responsable</th>
                  <th>Firma / Conformidad</th>
                </tr>
                <tr>
                  <td><strong>Supervisor que Recibe (Cierre)</strong></td>
                  <td>${supervisorName}</td>
                  <td><span style="color: #059669; font-weight: 700;">${record.signature_supervisor || 'Firmado'}</span></td>
                </tr>
                <tr>
                  <td><strong>Técnico Ejecutante</strong></td>
                  <td>${assignedMechanicName}</td>
                  <td><span style="color: #0f172a; font-weight: 600;">${record.signature_executor || 'Firmado'}</span></td>
                </tr>
                <tr>
                  <td><strong>Supervisor de Intervención</strong></td>
                  <td>${execSupervisorName}</td>
                  <td><span style="color: #0f172a; font-weight: 600;">${checklist._executionSupervisorSignature || record.signature_execution_supervisor || 'Validado'}</span></td>
                </tr>
              </table>

              ${record.observations ? `
              <div class="section-title">Observaciones Finales</div>
              <div class="desc-box" style="margin-bottom: 24px;">
                ${record.observations.replace(/\n/g, '<br/>')}
              </div>
              ` : ''}

              <div class="btn-container">
                <a href="${orderUrl}" class="btn" target="_blank">Abrir Orden Cerrada en CoreFlow &rarr;</a>
              </div>
            </div>
            <div class="footer">
              Este es un correo automático generado por el Sistema CoreFlow al cerrarse formalmente una orden de mantenimiento.<br/>
              &copy; 2026 CoreFlow Industrial Systems. Todos los derechos reservados.
            </div>
          </div>
        </body>
        </html>
      `;

      // Send with Resend
      const sendPromises = recipientEmails.map(async (toEmail) => {
        try {
          const { data, error } = await resend.emails.send({
            from: sender,
            to: toEmail,
            subject,
            html,
          });
          if (error) {
            console.error(`Error enviando Cierre a ${toEmail}:`, error);
            return { email: toEmail, success: false, error };
          }
          return { email: toEmail, success: true, id: data?.id };
        } catch (err: any) {
          console.error(`Excepción enviando Cierre a ${toEmail}:`, err.message);
          return { email: toEmail, success: false, error: err.message };
        }
      });

      const sendResults = await Promise.all(sendPromises);
      const successfulSends = sendResults.filter(r => r.success);

      console.log(`Resultado envío Cierre ${formCode} [${displayId}]: ${successfulSends.length}/${recipientEmails.length} entregados`);

      return new Response(JSON.stringify({ 
        success: true, 
        event: 'work_order_closed',
        formCode,
        displayId,
        totalRecipients: recipientEmails.length,
        delivered: successfulSends.length,
        results: sendResults
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // =============================================================
    // CASE B: NUEVA SOLICITUD DE MANTENIMIENTO (Stage REQUESTED)
    // =============================================================
    const formTitle = isRMant02 ? 'Mantenimiento Preventivo (R-MANT-02)' : 'Solicitud de Mantenimiento Correctivo (R-MANT-05)';
    const prefKey = isRMant02 ? 'alerts_rmant02' : 'alerts_rmant05';
    const accentColor = isRMant02 ? '#059669' : '#dc2626'; // Emerald for preventive, Red/Amber for corrective

    console.log(`--- PROCESANDO NOTIFICACIÓN SOLICITUD ${formCode}: ${displayId} ---`);

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

    console.log(`Destinatarios para solicitud ${formCode} [${displayId}]:`, recipientEmails);

    // 4. HTML Template for Email
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

    console.log(`Resultado envío solicitud ${formCode} [${displayId}]: ${successfulSends.length}/${recipientEmails.length} entregados`);

    return new Response(JSON.stringify({ 
      success: true, 
      event: 'work_order_requested',
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
