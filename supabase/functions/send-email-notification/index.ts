import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { Resend } from "npm:resend@3.2.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejo de CORS Prefight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, table, record } = payload;

    // Conexión a Supabase usando Service Role Key para consultar profiles
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let subject = '';
    let html = '';
    let recipients: string[] = [];

    // Obtenemos todos los perfiles con correos y preferencias
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('email, notification_preferences');
    
    if (error) throw error;

    // ==========================================
    // Caso 1: Averías (work_orders)
    // ==========================================
    if (table === 'work_orders' && record.type === 'Correctivo') {
      recipients = users
        // Manejamos el valor asegurándolo a string para ser tolerantes con true y "true"
        .filter(u => u.notification_preferences && String(u.notification_preferences.alerts_rmant05) === 'true')
        .map(u => u.email)
        .filter(Boolean) as string[];

      if (recipients.length > 0) {
        subject = '🚨 Alerta CoreFlow: Nueva Avería R-MANT-05';
        html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Nueva Avería Registrada</h2>
            <p><strong>Equipo:</strong> ${record.machinePlate || record.machineId || 'No especificado'}</p>
            <p><strong>Descripción:</strong> ${record.description || record.requestDescription || 'Sin detalles adiciones'}</p>
            <br>
            <p>Por favor ingrese al sistema CoreFlow para revisar y asignar los recursos necesarios.</p>
          </div>
        `;
      }
    } 
    // ==========================================
    // Caso 2: Stock Crítico (spare_parts)
    // ==========================================
    else if (table === 'spare_parts' && record.current_stock <= record.min_stock) {
      recipients = users
        .filter(u => u.notification_preferences && String(u.notification_preferences.low_stock) === 'true')
        .map(u => u.email)
        .filter(Boolean) as string[];

      if (recipients.length > 0) {
        subject = '⚠️ Alerta CoreFlow: Stock Crítico de Repuesto';
        html = `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Stock Crítico Detectado</h2>
            <p><strong>Repuesto:</strong> ${record.name || record.sku || 'Desconocido'}</p>
            <p><strong>Stock Actual:</strong> <span style="color: red; font-weight: bold;">${record.current_stock}</span></p>
            <p><strong>Stock Mínimo:</strong> ${record.min_stock}</p>
            <br>
            <p>Se requiere realizar una solicitud de compra o reabastecimiento pronto.</p>
          </div>
        `;
      }
    }

    // Si no hay destinatarios o no es un evento de interés, salir
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ message: "No target recipients or unhandled event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Envío del correo con Resend
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipients,
      subject,
      html,
    });

    if (emailError) throw emailError;

    return new Response(JSON.stringify({ success: true, emailData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error en Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
