// ── Email Service (Brevo / ex-Sendinblue — 300 emails/jour gratuit) ──
// Ce service gère l'envoi de notifications email transactionnelles.
//
// Architecture :
//   Frontend (ce fichier) → Supabase Edge Function → Brevo API
//   
// En mode démo (pas de VITE_EMAIL_ENDPOINT), les emails sont simulés
// et affichés dans la console + stockés dans localStorage pour debug.

const EMAIL_ENDPOINT = import.meta.env.VITE_EMAIL_ENDPOINT || '';
const EMAIL_QUEUE_KEY = 'medilio_email_queue';

// ── Email Templates ──
const TEMPLATES = {
  // Patient crée une mission → notifier les pros de la zone
  NEW_MISSION: {
    subject: '🏥 Nouvelle mission disponible — {careType}',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #0e7490 100%); padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Medilio</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Soins à domicile</p>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Nouvelle mission disponible 📋</h2>
          <p style="color: #475569; line-height: 1.6;">Une nouvelle demande de <strong>{careType}</strong> a été publiée dans votre zone.</p>
          <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px;">📍 <strong>{city}</strong></p>
            <p style="margin: 4px 0 0; font-size: 14px;">📅 {date} à {time}</p>
            <p style="margin: 4px 0 0; font-size: 14px;">💰 {cost} €</p>
          </div>
          <a href="{appUrl}/pro/radar" style="display: block; text-align: center; background: linear-gradient(135deg, #2563EB, #06B6D4); color: white; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Voir la mission →
          </a>
        </div>
        <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;">
          © 2026 Medilio — Vous recevez cet email car vous êtes professionnel sur Medilio.
        </p>
      </div>
    `,
  },

  // Pro postule → notifier le patient
  NEW_APPLICATION: {
    subject: '👨‍⚕️ Nouvelle candidature pour votre mission — {careType}',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #0e7490 100%); padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Medilio</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Bonne nouvelle ! 🎉</h2>
          <p style="color: #475569; line-height: 1.6;"><strong>{proName}</strong> a postulé à votre demande de <strong>{careType}</strong>.</p>
          {message}
          <a href="{appUrl}/patient/mission/{missionId}" style="display: block; text-align: center; background: linear-gradient(135deg, #2563EB, #06B6D4); color: white; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Voir la candidature →
          </a>
        </div>
        <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;">
          © 2026 Medilio
        </p>
      </div>
    `,
  },

  // Patient accepte un pro → notifier le pro
  MISSION_ACCEPTED: {
    subject: '✅ Votre candidature a été acceptée — {careType}',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #0e7490 100%); padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Medilio</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Candidature acceptée ✅</h2>
          <p style="color: #475569; line-height: 1.6;">Votre candidature pour la mission <strong>{careType}</strong> a été acceptée par le patient.</p>
          <div style="background: #d1fae5; padding: 16px; border-radius: 12px; margin: 16px 0; border: 1px solid #a7f3d0;">
            <p style="margin: 0; font-size: 14px; color: #065f46;">📍 {address}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #065f46;">📅 {date} à {time}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #065f46;">👤 Patient : {patientName}</p>
          </div>
          <a href="{appUrl}/pro/mission/{missionId}" style="display: block; text-align: center; background: #10b981; color: white; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Voir les détails de la mission →
          </a>
        </div>
        <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;">
          © 2026 Medilio
        </p>
      </div>
    `,
  },

  // Rappel J-1
  REMINDER: {
    subject: '⏰ Rappel : mission demain — {careType}',
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 24px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #0e7490 100%); padding: 24px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 20px;">Medilio</h1>
        </div>
        <div style="background: white; padding: 24px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="margin: 0 0 16px; font-size: 18px; color: #0f172a;">Rappel — mission demain ⏰</h2>
          <p style="color: #475569; line-height: 1.6;">Vous avez une mission de <strong>{careType}</strong> programmée pour demain.</p>
          <div style="background: #fef3c7; padding: 16px; border-radius: 12px; margin: 16px 0; border: 1px solid #fde68a;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">📍 {address}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #92400e;">🕐 {time}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #92400e;">👤 {contactName}</p>
          </div>
          <a href="{appUrl}" style="display: block; text-align: center; background: linear-gradient(135deg, #2563EB, #06B6D4); color: white; padding: 14px; border-radius: 12px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Ouvrir Medilio →
          </a>
        </div>
        <p style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 16px;">
          © 2026 Medilio
        </p>
      </div>
    `,
  },
};

/**
 * Replace template variables {var} with actual values
 */
function renderTemplate(template, vars) {
  let subject = template.subject;
  let html = template.html;

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    subject = subject.replace(regex, value || '');
    html = html.replace(regex, value || '');
  }

  return { subject, html };
}

/**
 * Get the app URL for email links
 */
function getAppUrl() {
  return window.location.origin;
}

/**
 * Store email in local queue for debug/demo
 */
function queueLocally(email) {
  try {
    const queue = JSON.parse(localStorage.getItem(EMAIL_QUEUE_KEY) || '[]');
    queue.unshift({
      ...email,
      id: Date.now().toString(),
      sentAt: new Date().toISOString(),
      status: EMAIL_ENDPOINT ? 'sent' : 'simulated',
    });
    // Keep last 50
    localStorage.setItem(EMAIL_QUEUE_KEY, JSON.stringify(queue.slice(0, 50)));
  } catch { /* ignore */ }
}

export const emailService = {
  /**
   * Send an email via the configured endpoint (Supabase Edge Function → Brevo)
   * Falls back to console + localStorage in demo mode
   */
  async send({ to, templateId, vars = {} }) {
    const template = TEMPLATES[templateId];
    if (!template) {
      console.warn(`Email template "${templateId}" not found`);
      return false;
    }

    const { subject, html } = renderTemplate(template, {
      ...vars,
      appUrl: getAppUrl(),
    });

    const email = { to, subject, html, templateId, vars };

    // ── Production mode: call Edge Function ──
    if (EMAIL_ENDPOINT) {
      try {
        const response = await fetch(EMAIL_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to, subject, html }),
        });

        if (!response.ok) {
          const err = await response.text();
          console.error('Email send failed:', err);
          queueLocally({ ...email, status: 'error', error: err });
          return false;
        }

        queueLocally(email);
        console.log(`📧 Email envoyé à ${to}: ${subject}`);
        return true;
      } catch (err) {
        console.error('Email send error:', err);
        queueLocally({ ...email, status: 'error', error: err.message });
        return false;
      }
    }

    // ── Demo mode: simulate ──
    console.log(`📧 [SIMULATION] Email → ${to}`);
    console.log(`   Sujet: ${subject}`);
    console.log(`   Pour activer l'envoi réel, configurez VITE_EMAIL_ENDPOINT`);
    queueLocally(email);
    return true;
  },

  // ── Convenience Methods ──

  /**
   * Notifier les pros d'une nouvelle mission
   */
  async notifyNewMission({ proEmails = [], mission, careTypeLabel }) {
    const results = [];
    for (const email of proEmails) {
      const ok = await this.send({
        to: email,
        templateId: 'NEW_MISSION',
        vars: {
          careType: careTypeLabel,
          city: mission.address?.city || '',
          date: mission.scheduledDate,
          time: mission.scheduledTime,
          cost: mission.estimatedCost || '—',
        },
      });
      results.push({ email, ok });
    }
    return results;
  },

  /**
   * Notifier le patient d'une nouvelle candidature
   */
  async notifyNewApplication({ patientEmail, proName, mission, careTypeLabel, message = '' }) {
    const messageBlock = message
      ? `<div style="background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 12px 0; font-style: italic; color: #475569;">"${message}"</div>`
      : '';

    return this.send({
      to: patientEmail,
      templateId: 'NEW_APPLICATION',
      vars: {
        proName,
        careType: careTypeLabel,
        missionId: mission.id,
        message: messageBlock,
      },
    });
  },

  /**
   * Notifier le pro que sa candidature est acceptée
   */
  async notifyMissionAccepted({ proEmail, mission, careTypeLabel, patientName }) {
    return this.send({
      to: proEmail,
      templateId: 'MISSION_ACCEPTED',
      vars: {
        careType: careTypeLabel,
        address: `${mission.address?.street}, ${mission.address?.city}`,
        date: mission.scheduledDate,
        time: mission.scheduledTime,
        patientName,
        missionId: mission.id,
      },
    });
  },

  /**
   * Envoyer un rappel J-1
   */
  async sendReminder({ to, mission, careTypeLabel, contactName }) {
    return this.send({
      to,
      templateId: 'REMINDER',
      vars: {
        careType: careTypeLabel,
        address: `${mission.address?.street}, ${mission.address?.city}`,
        time: mission.scheduledTime,
        contactName,
      },
    });
  },

  /**
   * Récupérer la queue d'emails (pour debug / admin)
   */
  getEmailQueue() {
    try {
      return JSON.parse(localStorage.getItem(EMAIL_QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  /**
   * Vider la queue d'emails
   */
  clearEmailQueue() {
    localStorage.removeItem(EMAIL_QUEUE_KEY);
  },

  /**
   * Vérifier si le service email est configuré pour l'envoi réel
   */
  isConfigured() {
    return !!EMAIL_ENDPOINT;
  },
};

export default emailService;
