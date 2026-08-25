import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const ALLOWED_EVENTS = new Set(['new_application', 'mission_accepted', 'reminder']);

function json(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function emailLayout(title: string, content: string, link: string, appUrl: string) {
  const safeLink = `${appUrl.replace(/\/$/, '')}${link}`;
  return `<!doctype html>
  <html lang="fr"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="max-width:600px;margin:0 auto;padding:24px">
      <div style="background:#1e40af;color:#fff;padding:22px;border-radius:16px 16px 0 0;text-align:center">
        <strong style="font-size:20px">Medilio</strong>
      </div>
      <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px">
        <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
        ${content}
        <a href="${escapeHtml(safeLink)}" style="display:block;margin-top:20px;padding:13px;text-align:center;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;font-weight:700">Ouvrir Medilio</a>
      </div>
      <p style="font-size:11px;color:#64748b;text-align:center">Message transactionnel Medilio.</p>
    </div>
  </body></html>`;
}

function tomorrowInParis() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const parisDate = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  parisDate.setUTCDate(parisDate.getUTCDate() + 1);
  return parisDate.toISOString().slice(0, 10);
}

serve(async request => {
  const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://medilio.vercel.app')
    .split(',').map(value => value.trim()).filter(Boolean);
  const requestOrigin = request.headers.get('origin') || configuredOrigins[0];
  const responseOrigin = configuredOrigins.includes(requestOrigin) ? requestOrigin : configuredOrigins[0];

  if (!configuredOrigins.includes(requestOrigin)) return json({ error: 'Origine non autorisée.' }, 403, responseOrigin);
  if (request.method === 'OPTIONS') return json({ ok: true }, 200, responseOrigin);
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405, responseOrigin);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  const senderEmail = Deno.env.get('SENDER_EMAIL');
  const senderName = Deno.env.get('SENDER_NAME') || 'Medilio';
  const appUrl = Deno.env.get('APP_URL') || configuredOrigins[0];
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Service indisponible.' }, 503, responseOrigin);
  }

  const authorization = request.headers.get('authorization');
  const token = authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Authentification requise.' }, 401, responseOrigin);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Session invalide.' }, 401, responseOrigin);
  if (!brevoApiKey || !senderEmail) {
    return json({ error: 'Service email non configuré.' }, 503, responseOrigin);
  }

  let payload: { event?: string; missionId?: string };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Corps JSON invalide.' }, 400, responseOrigin);
  }
  if (!payload.event || !ALLOWED_EVENTS.has(payload.event) || !payload.missionId) {
    return json({ error: 'Événement ou mission invalide.' }, 400, responseOrigin);
  }

  const actorId = authData.user.id;
  const { data: mission, error: missionError } = await admin.from('missions')
    .select('id,patient_id,created_by_establishment_id,assigned_pro_id,status,scheduled_date')
    .eq('id', payload.missionId).single();
  if (missionError || !mission) return json({ error: 'Mission introuvable.' }, 404, responseOrigin);

  let recipientId: string;
  let title: string;
  let subject: string;
  let body: string;
  let link: string;

  if (payload.event === 'new_application') {
    const { data: application } = await admin.from('mission_applicants').select('id')
      .eq('mission_id', mission.id).eq('pro_id', actorId).maybeSingle();
    if (!application) return json({ error: 'Candidature non autorisée.' }, 403, responseOrigin);
    recipientId = mission.created_by_establishment_id || mission.patient_id;
    title = 'Nouvelle candidature';
    subject = 'Nouvelle candidature sur Medilio';
    body = '<p style="line-height:1.6">Une nouvelle candidature est disponible dans votre espace sécurisé Medilio.</p>';
    link = mission.created_by_establishment_id ? '/etab/dashboard' : '/patient/dashboard';
  } else if (payload.event === 'mission_accepted') {
    const isOwner = actorId === mission.patient_id || actorId === mission.created_by_establishment_id;
    if (!isOwner || !mission.assigned_pro_id || mission.status !== 'assigned') {
      return json({ error: 'Affectation non autorisée.' }, 403, responseOrigin);
    }
    recipientId = mission.assigned_pro_id;
    title = 'Candidature acceptée';
    subject = 'Votre candidature a été acceptée';
    body = `<p style="line-height:1.6">Votre candidature a été acceptée. Les coordonnées précises sont désormais disponibles dans l’espace sécurisé Medilio.</p>`;
    link = '/pro/dashboard';
  } else {
    const isParticipant = actorId === mission.patient_id
      || actorId === mission.created_by_establishment_id
      || actorId === mission.assigned_pro_id;
    if (!isParticipant || !['assigned', 'in_progress'].includes(mission.status)) {
      return json({ error: 'Rappel non autorisé.' }, 403, responseOrigin);
    }
    if (mission.scheduled_date !== tomorrowInParis()) {
      return json({ error: 'Le rappel ne peut être envoyé que la veille de la mission.' }, 409, responseOrigin);
    }
    recipientId = actorId;
    title = 'Rappel de mission';
    subject = 'Rappel de mission Medilio';
    body = '<p style="line-height:1.6">Une mission est prévue demain. Consultez votre espace sécurisé Medilio pour les détails.</p>';
    link = actorId === mission.assigned_pro_id
      ? '/pro/dashboard'
      : mission.created_by_establishment_id ? '/etab/dashboard' : '/patient/dashboard';
  }

  const { data: recipient, error: recipientError } = await admin.from('profiles')
    .select('email,disabled').eq('id', recipientId).single();
  if (recipientError || !recipient?.email || recipient.disabled) {
    return json({ error: 'Destinataire indisponible.' }, 422, responseOrigin);
  }

  const dispatchRow = {
    event: payload.event,
    mission_id: mission.id,
    requested_by: actorId,
    recipient_id: recipientId,
    status: 'pending',
  };
  const { data: dispatch, error: dispatchError } = await admin.from('email_dispatches')
    .insert(dispatchRow).select('id').single();
  if (dispatchError?.code === '23505') {
    const { data: existing } = await admin.from('email_dispatches').select('id,status')
      .eq('event', payload.event).eq('mission_id', mission.id)
      .eq('recipient_id', recipientId).eq('requested_by', actorId).single();
    if (existing?.status === 'sent' || existing?.status === 'pending') {
      return json({ success: true, alreadySent: true }, 200, responseOrigin);
    }
    if (existing) {
      await admin.from('email_dispatches').update({ status: 'pending', requested_by: actorId }).eq('id', existing.id);
    }
  } else if (dispatchError) {
    return json({ error: 'Journalisation email impossible.' }, 500, responseOrigin);
  }

  const dispatchId = dispatch?.id || (await admin.from('email_dispatches').select('id')
    .eq('event', payload.event).eq('mission_id', mission.id)
    .eq('recipient_id', recipientId).eq('requested_by', actorId).single()).data?.id;
  const providerResponse = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': brevoApiKey },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: recipient.email }],
      subject,
      htmlContent: emailLayout(title, body, link, appUrl),
    }),
  });

  if (!providerResponse.ok) {
    if (dispatchId) await admin.from('email_dispatches').update({ status: 'failed' }).eq('id', dispatchId);
    return json({ error: 'Le fournisseur email a refusé la demande.' }, 502, responseOrigin);
  }

  const providerResult = await providerResponse.json();
  if (dispatchId) {
    await admin.from('email_dispatches').update({
      status: 'sent', provider_message_id: providerResult.messageId || null,
    }).eq('id', dispatchId);
  }
  return json({ success: true }, 200, responseOrigin);
});
