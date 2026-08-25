// ── Reminder Service — Rappels automatiques J-1 ──
// Vérifie les missions du lendemain et envoie des rappels par email.
// S'exécute au chargement de l'app (ou via un cron Supabase en prod).
// Les rappels déjà envoyés sont tracés dans localStorage pour éviter les doublons.

import emailService from './emailService';
import missionService from './missionService';
import authService from './authService';

const SENT_KEY = 'medilio_reminders_sent';

function getSentReminders() {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
  } catch {
    return {};
  }
}

function markReminderSent(missionId, type) {
  const sent = getSentReminders();
  const key = `${missionId}_${type}`;
  sent[key] = new Date().toISOString();

  // Clean up entries older than 7 days
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  for (const [k, v] of Object.entries(sent)) {
    if (new Date(v).getTime() < weekAgo) delete sent[k];
  }

  localStorage.setItem(SENT_KEY, JSON.stringify(sent));
}

function wasReminderSent(missionId, type) {
  const sent = getSentReminders();
  return !!sent[`${missionId}_${type}`];
}

function getTomorrowStr() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

export const reminderService = {
  /**
   * Vérifie et envoie les rappels pour les missions du lendemain.
   * À appeler une fois par session (au chargement de l'app).
   * @param {string} currentUserId - L'utilisateur connecté
   * @returns {Promise<{sent: number, skipped: number}>}
   */
  async checkAndSendReminders(currentUserId) {
    if (!currentUserId) return { sent: 0, skipped: 0 };

    const tomorrow = getTomorrowStr();
    let sent = 0;
    let skipped = 0;

    try {
      const session = await authService.getProfile(currentUserId);
      if (!session) return { sent: 0, skipped: 0 };
      const myMissions = session.role === 'professional'
        ? await missionService.getByProfessional(currentUserId)
        : session.role === 'establishment'
          ? await missionService.getByEstablishment(currentUserId)
          : await missionService.getByPatient(currentUserId);
      const tomorrowMissions = myMissions.filter(mission =>
        mission.scheduledDate === tomorrow && ['assigned', 'in_progress'].includes(mission.status)
      );

      for (const mission of tomorrowMissions) {
        const reminderType = session.role;
        if (wasReminderSent(mission.id, reminderType)) {
          skipped++;
          continue;
        }
        await emailService.sendReminder({ mission });
        markReminderSent(mission.id, reminderType);
        sent++;
      }
    } catch (err) {
      console.warn('Reminder check error:', err);
    }

    if (sent > 0) {
      console.log(`⏰ ${sent} rappel(s) envoyé(s) pour les missions de demain`);
    }

    return { sent, skipped };
  },

  /**
   * Récupérer les rappels envoyés (pour debug)
   */
  getSentReminders,

  /**
   * Reset les rappels (pour test)
   */
  clearSentReminders() {
    localStorage.removeItem(SENT_KEY);
  },
};

export default reminderService;
