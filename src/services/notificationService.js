// ── Notification Service (Local + Supabase-aware) ──
// Notifications remain in localStorage for now (ephemeral, per-session)
// Can be migrated to a Supabase table later for persistence across devices
import { v4 as uuidv4 } from 'uuid';

const NOTIF_KEY = 'medilio_notifications';

function getAll() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(notifs) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs));
}

export const notificationService = {
  create({ userId, type, title, message, link = '' }) {
    const notifications = getAll();
    const notification = {
      id: uuidv4(),
      userId,
      type,
      title,
      message,
      read: false,
      link,
      createdAt: new Date().toISOString(),
    };
    notifications.unshift(notification);
    saveAll(notifications);
    return notification;
  },

  getByUser(userId) {
    return getAll().filter(n => n.userId === userId);
  },

  getUnreadCount(userId) {
    return getAll().filter(n => n.userId === userId && !n.read).length;
  },

  markAsRead(notificationId) {
    const notifications = getAll();
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications[index].read = true;
      saveAll(notifications);
    }
  },

  markAllAsRead(userId) {
    const notifications = getAll();
    notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    saveAll(notifications);
  },

  delete(notificationId) {
    const notifs = getAll().filter(n => n.id !== notificationId);
    saveAll(notifs);
  },
};

export default notificationService;
