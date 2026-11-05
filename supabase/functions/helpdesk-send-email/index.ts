import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@3.2.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle preflight CORS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { ticketId, ticketSubject, recipientEmail, recipientName, messageBody, senderName } = payload;

    if (!ticketId || !recipientEmail || !messageBody) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: ticketId, recipientEmail, messageBody' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY is not configured on the backend.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const resend = new Resend(resendApiKey);

    // Subject must contain [TKT-ticketId] for the inbound email parser to match it back to the ticket!
    const subject = `[TKT-${ticketId}] Re: ${ticketSubject || 'Soporte CoreFlow'}`;

    const textLines = [
      '============================================================',
      'COREFLOW - MESA DE AYUDA (HELP DESK)',
      '============================================================',
      '',
      `Agente ${senderName || 'Soporte'} ha respondido a tu ticket:`,
      '------------------------------------------------------------',
      messageBody,
      '------------------------------------------------------------',
      '',
      'Si tienes dudas adicionales, puedes responder directamente a este correo electrónico o acceder a tu portal.',
      '',
      'NOTA IMPORTANTE:',
      'Para agregar nuevos comentarios a este ticket, simplemente responde a este correo manteniendo el código de asunto intacto.',
      '',
      '------------------------------------------------------------',
      '© 2026 CoreFlow Industrial Systems. Todos los derechos reservados.',
    ];

    const text = textLines.join('\n');

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'CoreFlow Help Desk <soporte@soporte.ravicaribe.com>',
      to: [recipientEmail],
      subject,
      text,
    });

    if (emailError) throw emailError;

    console.log(`Email sent successfully to ${recipientEmail}. ID: ${emailData?.id}`);

    return new Response(JSON.stringify({ success: true, emailId: emailData?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Error in helpdesk-send-email function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
