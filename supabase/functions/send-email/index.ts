// ── Supabase Edge Function: send-email (Brevo / ex-Sendinblue) ──
// Deployer avec: supabase functions deploy send-email
//
// Variables d'environnement requises (dans Supabase Dashboard → Edge Functions → Secrets) :
//   BREVO_API_KEY = votre clé API Brevo
//   SENDER_EMAIL = email vérifié dans Brevo (ex: noreply@medilio.fr)
//   SENDER_NAME = Medilio

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY');
    const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'noreply@medilio.fr';
    const SENDER_NAME = Deno.env.get('SENDER_NAME') || 'Medilio';

    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not set. Configure it in Supabase Edge Function secrets.');
    }

    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Brevo API
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: to }],
        subject: subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Email send failed', details: errorText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge Function error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
