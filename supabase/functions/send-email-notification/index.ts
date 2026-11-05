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

      // 3. Low Stock Plain Text Email Template
      const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'https://coreflow-six.vercel.app';
      const inventoryUrl = `${appUrl}/inventory`;
      const subject = `⚠️ Alerta de Bajo Stock: ${partName} [${partSku}] - ${companyName}`;

      const locationStr = `${record.location_code || 'No asignada'}${record.sub_location ? ` (${record.sub_location})` : ''}`;
      const machineStr = (record.machine_name || record.machine_plate)
        ? `${record.machine_name || ''}${record.machine_plate ? ` [${record.machine_plate}]` : ''}`.trim()
        : '';

      const textLines = [
        '============================================================',
        'COREFLOW - SISTEMA DE MANTENIMIENTO INDUSTRIAL',
        'ALERTA DE INVENTARIO • BAJO STOCK',
        '============================================================',
        '',
        'REPUESTO EN NIVEL CRÍTICO DE STOCK',
        'Se ha detectado que el siguiente repuesto ha alcanzado o caído por debajo de su nivel de stock de seguridad.',
        '',
        'DETALLES DEL REPUESTO:',
        '------------------------------------------------------------',
        `• Código / SKU:        ${partSku}`,
        `• Nombre del Repuesto: ${partName}`,
        `• Stock Actual:        ${currentStock} ${unit}`,
        `• Stock Mínimo:        ${minStock} ${unit}`,
        ...(record.maximum_stock ? [`• Stock Máximo:        ${record.maximum_stock} ${unit}`] : []),
        `• Empresa / Planta:    ${companyName}`,
        `• Ubicación / Tramo:   ${locationStr}`,
        ...(record.category ? [`• Categoría:           ${record.category}`] : []),
        ...(record.supplier ? [`• Proveedor:           ${record.supplier}`] : []),
        ...(machineStr ? [`• Equipo Asociado:     ${machineStr}`] : []),
        '------------------------------------------------------------',
        '',
        'ACCIÓN REQUERIDA:',
        'Se requiere revisar la disponibilidad física en almacén e iniciar una solicitud de reposición o compra para evitar retrasos o desabastecimiento en futuras intervenciones.',
        '',
        'ABRIR INVENTARIO EN COREFLOW:',
        inventoryUrl,
        '',
        '------------------------------------------------------------',
        'Este es un correo automático generado por el Sistema CoreFlow.',
        '© 2026 CoreFlow Industrial Systems. Todos los derechos reservados.',
      ];

      const text = textLines.join('\n');

      // 4. Send with Resend using verified domain: notificaciones@ravicaribeinc.com
      const sender = 'CoreFlow <notificaciones@ravicaribeinc.com>';

      const sendPromises = recipientEmails.map(async (toEmail) => {
        try {
          const { data, error } = await resend.emails.send({
            from: sender,
            to: toEmail,
            subject,
            text,
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
      const partsLines: string[] = [];
      if (consumedParts.length > 0) {
        consumedParts.forEach((p: any) => {
          const qty = p.quantity ?? p.qty ?? 1;
          const unit = p.unit || 'und';
          const cost = Number(p.totalCost || (p.cost ? Number(p.cost) * Number(qty) : 0)).toFixed(2);
          const skuStr = (p.code || p.partNumber || p.sku) ? ` [SKU: ${p.code || p.partNumber || p.sku}]` : '';
          partsLines.push(`• ${p.name || p.partName || 'Repuesto'}${skuStr}: ${qty} ${unit} - $${cost}`);
        });
        partsLines.push(`Costo Total Mantenimiento: $${Number(record.total_maintenance_cost || 0).toFixed(2)}`);
      } else {
        partsLines.push('• Sin consumo de repuestos de almacén registrado ($0.00).');
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

      const checklistLines = checklistEntries.map(item =>
        `[${item.val === true ? '✓ Conforme' : '  N/A     '}] ${item.label}`
      );

      const subject = `✅ Cierre de Mantenimiento [${displayId}] - ${equipmentName} (${branchName})`;

      const textLines = [
        '============================================================',
        'COREFLOW - SISTEMA DE MANTENIMIENTO INDUSTRIAL',
        `CIERRE FORMAL • ${formTitle.toUpperCase()}`,
        '============================================================',
        '',
        'MANTENIMIENTO FINALIZADO Y CONFORME',
        `La orden de trabajo ${displayId} ha sido completada formalmente y aceptada en el tercer paso de Cierre y Entrega.`,
        '',
        'DATOS DE LA ORDEN:',
        '------------------------------------------------------------',
        `• Código de Orden:          ${displayId}`,
        `• Tipo de Orden:            ${isRMant02 ? 'Preventivo Programado' : 'Correctivo / Reparación de Falla'}`,
        `• Equipo / Máquina:         ${equipmentName}${machineCode ? ` [${machineCode}]` : ''}`,
        `• Planta / Sucursal:        ${branchName}`,
        `• Fecha y Hora de Cierre:   ${closingDateFormatted}`,
        `• Periodo de Intervención:  ${interventionPeriod}`,
        ...(isRMant02 ? [
          `• Frecuencia / Intervalo:   ${record.interval_name || 'N/A'}`,
          `• Horas Máquina:            ${record.machine_work_hours ? `${record.machine_work_hours} hrs` : 'N/A'}`,
          `• Próximo Mantenimiento:    ${record.next_maintenance_hours ? `${record.next_maintenance_hours} hrs` : 'N/A'}`,
          `• Tareas de Rutina:         ${completedTasks} de ${totalTasks} ejecutadas (${taskPct}%)`,
        ] : [
          `• Tipo de Falla:            ${record.failure_type || 'No especificada'}`,
          `• Condición / Prioridad:    ${record.condition || record.priority || 'Normal'}`,
          ...(record.frequency ? [`• Frecuencia de Falla:      ${record.frequency}`] : []),
        ]),
        '------------------------------------------------------------',
        ...(isRMant05 ? [
          '',
          'DETALLE DEL REPORTE Y TRABAJO CORRECTIVO:',
          `• Falla / Solicitud Reportada:\n${record.request_description || record.description || 'Sin descripción'}`,
          '',
          `• Acción Correctiva Ejecutada:\n${record.action_taken || 'Intervención completada según protocolo'}`,
          '------------------------------------------------------------',
        ] : []),
        '',
        'VERIFICACIÓN DE CIERRE Y ENTREGA (CHECKLIST PASO 3):',
        ...checklistLines,
        '------------------------------------------------------------',
        '',
        'REPUESTOS Y MATERIALES CONSUMIDOS:',
        ...partsLines,
        '------------------------------------------------------------',
        '',
        'RESPONSABLES Y FIRMAS DE APROBACIÓN:',
        `• Supervisor que Recibe (Cierre): ${supervisorName} (${record.signature_supervisor || 'Firmado'})`,
        `• Técnico Ejecutante:             ${assignedMechanicName} (${record.signature_executor || 'Firmado'})`,
        `• Supervisor de Intervención:     ${execSupervisorName} (${checklist._executionSupervisorSignature || record.signature_execution_supervisor || 'Validado'})`,
        '------------------------------------------------------------',
        ...(record.observations ? [
          '',
          'OBSERVACIONES FINALES:',
          record.observations,
          '------------------------------------------------------------',
        ] : []),
        '',
        'ABRIR ORDEN CERRADA EN COREFLOW:',
        orderUrl,
        '',
        '------------------------------------------------------------',
        'Este es un correo automático generado por el Sistema CoreFlow al cerrarse formalmente una orden de mantenimiento.',
        '© 2026 CoreFlow Industrial Systems. Todos los derechos reservados.',
      ];

      const text = textLines.join('\n');

      // Send with Resend
      const sendPromises = recipientEmails.map(async (toEmail) => {
        try {
          const { data, error } = await resend.emails.send({
            from: sender,
            to: toEmail,
            subject,
            text,
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

    // 4. Plain Text Template for Email
    const branchName = record.branch || 'Planta Principal';
    
    const subject = isRMant02
      ? `🛠️ Nuevo Mantenimiento Preventivo [${displayId}] - ${branchName}`
      : `🚨 Nueva Solicitud de Mantenimiento Correctivo [${displayId}] - ${branchName}`;

    const priorityBadge = record.condition || record.priority || 'Normal';
    const equipmentName = record.title || record.machine_name || 'Equipo no especificado';
    const descriptionText = record.request_description || record.description || 'Sin descripción detallada';

    const textLines = [
      '============================================================',
      'COREFLOW - SISTEMA DE MANTENIMIENTO INDUSTRIAL',
      formTitle.toUpperCase(),
      '============================================================',
      '',
      'NUEVA SOLICITUD DE MANTENIMIENTO',
      'Se ha registrado una nueva orden de trabajo en el sistema y se te ha notificado según tus preferencias.',
      '',
      'DATOS DE LA ORDEN:',
      '------------------------------------------------------------',
      `• Código de Orden:       ${displayId}`,
      `• Tipo de Orden:         ${isRMant02 ? 'Preventivo Programado' : 'Correctivo / Reparación de Falla'}`,
      `• Equipo / Máquina:      ${equipmentName}`,
      `• Prioridad / Condición: ${priorityBadge}`,
      `• Planta / Sucursal:     ${branchName}`,
      `• Técnico Asignado:      ${assignedMechanicName}`,
      '------------------------------------------------------------',
      '',
      'DETALLES DE LA SOLICITUD:',
      descriptionText,
      '',
      'ABRIR ORDEN EN COREFLOW:',
      orderUrl,
      '',
      '------------------------------------------------------------',
      'Este es un correo automático generado por el Sistema CoreFlow.',
      '© 2026 CoreFlow Industrial Systems. Todos los derechos reservados.',
    ];

    const text = textLines.join('\n');

    // 5. Send with Resend using verified domain: notificaciones@ravicaribeinc.com
    const sendPromises = recipientEmails.map(async (toEmail) => {
      try {
        const { data, error } = await resend.emails.send({
          from: sender,
          to: toEmail,
          subject,
          text,
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
