import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { ticketSubject, oldCategory, newCategory, reason } = payload;

    const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured on backend.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const systemPrompt = `Eres el asistente de soporte técnico de CoreFlow. Se está cambiando la categoría de un ticket de soporte de "${oldCategory || 'Sin categoría'}" a "${newCategory}" por la siguiente razón: "${reason || 'Reclasificación de ticket'}".

Genera un borrador de mensaje para el solicitante del ticket (debe ser amable, empático y profesional). El mensaje debe explicar brevemente que se está cambiando la categoría del ticket a "${newCategory}" y explicar la razón de forma resumida y clara en español. No inventes soluciones técnicas ni des explicaciones muy extensas. El mensaje debe terminar indicando que seguimos trabajando en su caso. Responde estrictamente solo con el texto del mensaje redactado, sin saludos de inicio excesivos, sin firmas ni etiquetas de marcado markdown adicionales.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 250,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Asunto del Ticket: "${ticketSubject}"\nCategoría anterior: "${oldCategory || 'Sin categoría'}"\nNueva categoría: "${newCategory}"\nRazón: "${reason || ''}"`
          }
        ]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI API Error:", errorText);
      return new Response(JSON.stringify({ error: `Error from OpenAI: ${errorText}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const aiData = await aiResponse.json();
    const draftText = aiData.choices?.[0]?.message?.content?.trim() || 'No se pudo generar el borrador.';

    return new Response(JSON.stringify({ success: true, draft: draftText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
