import { v4 as uuidv4 } from 'uuid';
import supabase from '../lib/supabase';
import { assertBackendConfigured, isDemoMode } from '../config/runtime';

const NOTIFICATION_KEY = 'medilio_notifications';

function readDemoNotifications() {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeDemoNotifications(notifications) {
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifications));
}

function mapNotification(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link || '',
    read: Boolean(row.read),
    createdAt: row.created_at,
  };
}

export const notificationService = {
  async create({ userId, type, title, message, link = '' }) {
    if (!isDemoMode) return null;
    const notification = {
      id: uuidv4(), userId, type, title, message, link, read: false,
      createdAt: new Date().toISOString(),
    };
    writeDemoNotifications([notification, ...readDemoNotifications()]);
    return notification;
  },

  async getByUser(userId) {
    if (isDemoMode) return readDemoNotifications().filter(item => item.userId === userId);
    assertBackendConfigured();
    const { data, error } = await supabase.from('notifications').select('*')
      .eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(mapNotification);
  },

  async markAsRead(notificationId) {
    if (isDemoMode) {
      writeDemoNotifications(readDemoNotifications().map(item =>
        item.id === notificationId ? { ...item, read: true } : item
      ));
      return;
    }
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    if (error) throw new Error(error.message);
  },

  async markAllAsRead(userId) {
    if (isDemoMode) {
      writeDemoNotifications(readDemoNotifications().map(item =>
        item.userId === userId ? { ...item, read: true } : item
      ));
      return;
    }
    const { error } = await supabase.from('notifications').update({ read: true })
      .eq('user_id', userId).eq('read', false);
    if (error) throw new Error(error.message);
  },

  async delete(notificationId) {
    if (isDemoMode) {
      writeDemoNotifications(readDemoNotifications().filter(item => item.id !== notificationId));
      return;
    }
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (error) throw new Error(error.message);
  },

  subscribeToUser(userId, onChange) {
    if (isDemoMode) return () => {};
    const channel = supabase.channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`,
      }, onChange)
      .subscribe();
    return () => supabase.removeChannel(channel);
  },
};

export default notificationService;
