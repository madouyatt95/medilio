import supabase from '../lib/supabase';
import { assertBackendConfigured, isDemoMode } from '../config/runtime';

const DEMO_QUEUE_KEY = 'medilio_email_queue';

function queueDemoEvent(event, missionId) {
  try {
    const queue = JSON.parse(localStorage.getItem(DEMO_QUEUE_KEY) || '[]');
    queue.unshift({ id: crypto.randomUUID(), event, missionId, createdAt: new Date().toISOString() });
    localStorage.setItem(DEMO_QUEUE_KEY, JSON.stringify(queue.slice(0, 50)));
  } catch {
    // The demo remains usable when storage is unavailable.
  }
}

async function dispatch(event, missionId) {
  if (!missionId) throw new Error('Mission requise pour la notification email.');
  if (isDemoMode) {
    queueDemoEvent(event, missionId);
    return true;
  }

  assertBackendConfigured();
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: { event, missionId },
  });
  if (error) throw new Error('La notification email n’a pas pu être envoyée.');
  return Boolean(data?.success || data?.alreadySent);
}

export const emailService = {
  notifyNewApplication({ mission }) {
    return dispatch('new_application', mission?.id);
  },

  notifyMissionAccepted({ mission }) {
    return dispatch('mission_accepted', mission?.id);
  },

  sendReminder({ mission }) {
    return dispatch('reminder', mission?.id);
  },

  getEmailQueue() {
    if (!isDemoMode) return [];
    try {
      return JSON.parse(localStorage.getItem(DEMO_QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  },

  clearEmailQueue() {
    if (isDemoMode) localStorage.removeItem(DEMO_QUEUE_KEY);
  },

  isConfigured() {
    return !isDemoMode;
  },
};

export default emailService;
