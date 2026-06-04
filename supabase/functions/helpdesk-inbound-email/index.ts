import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log("Inbound Email Payload received:", JSON.stringify({
      subject: payload.subject,
      from: payload.from,
      hasText: !!payload.text
    }));

    const subject = payload.subject || '';
    const from = payload.from || '';
    const textBody = payload.text || payload.html || 'Mensaje sin texto';

    // Buscar ID del ticket en el asunto. Formato esperado: [TKT-uuid]
    const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;
    const match = subject.match(uuidRegex);
    let ticketId = match ? match[0] : null;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Si no encontramos ID en el asunto, intentamos buscar el último ticket abierto del remitente
    if (!ticketId) {
      console.log("No Ticket ID found in subject. Attempting to match by email...");
      // Extraer email de formato "Nombre <email@domain.com>"
      const emailRegex = /<([^>]+)>/;
      const emailMatch = from.match(emailRegex);
      const pureEmail = emailMatch ? emailMatch[1] : from.trim();

      const { data: recentTickets } = await supabaseAdmin
        .from('helpdesk_tickets')
        .select('id')
        .eq('requester_email', pureEmail)
        .neq('status', 'cerrado')
        .neq('status', 'resuelto')
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentTickets && recentTickets.length > 0) {
        ticketId = recentTickets[0].id;
        console.log("Matched ticket by email:", ticketId);
      }
    }

    if (!ticketId) {
      console.warn("Could not determine ticket ID. Discarding email.");
      return new Response(JSON.stringify({ error: 'No matching ticket found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Intentar limpiar la cita del correo original (On ... wrote: o >)
    let cleanText = textBody.split(/\r?\nOn .* wrote:\r?\n/)[0]; // Inglés genérico
    cleanText = cleanText.split(/\r?\nEl .* escribió:\r?\n/)[0]; // Español genérico
    cleanText = cleanText.split(/\r?\n> /)[0]; // Citas de texto plano
    cleanText = cleanText.trim();

    // Insertar el mensaje
    const { error: insertError } = await supabaseAdmin
      .from('helpdesk_messages')
      .insert({
        ticket_id: ticketId,
        author_type: 'usuario',
        visibility: 'publico',
        source: 'email_inbound',
        body_text: cleanText || textBody // Fallback al original si se limpió todo por error
      });

    if (insertError) {
      console.error("Error inserting inbound message:", insertError);
      throw insertError;
    }

    // Opcional: Cambiar estado a 'abierto' o 'esperando_agente'
    await supabaseAdmin
      .from('helpdesk_tickets')
      .update({ status: 'abierto' })
      .eq('id', ticketId);

    return new Response(JSON.stringify({ success: true, ticket_id: ticketId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Inbound Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
