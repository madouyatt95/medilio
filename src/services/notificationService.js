// ── Notification Service ──
import { v4 as uuidv4 } from 'uuid';
import storageService from './storageService';

export const notificationService = {
  create({ userId, type, title, message, link = '' }) {
    const notifications = storageService.getNotifications();
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
    storageService.setNotifications(notifications);
    return notification;
  },

  getByUser(userId) {
    return storageService.getNotifications().filter(n => n.userId === userId);
  },

  getUnreadCount(userId) {
    return storageService.getNotifications().filter(n => n.userId === userId && !n.read).length;
  },

  markAsRead(notificationId) {
    const notifications = storageService.getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      notifications[index].read = true;
      storageService.setNotifications(notifications);
    }
  },

  markAllAsRead(userId) {
    const notifications = storageService.getNotifications();
    notifications.forEach(n => {
      if (n.userId === userId) n.read = true;
    });
    storageService.setNotifications(notifications);
  },

  delete(notificationId) {
    const notifs = storageService.getNotifications().filter(n => n.id !== notificationId);
    storageService.setNotifications(notifs);
  },
};

export default notificationService;
