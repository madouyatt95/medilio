// ── Notification Context ──
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    if (user) {
      setNotifications(notificationService.getByUser(user.id));
    } else {
      setNotifications([]);
    }
  }, [user]);

  const refresh = useCallback(() => {
    if (user) {
      const newNotifs = notificationService.getByUser(user.id);
      
      // If new unread notification detected (and it's not our first load)
      if (notifications.length > 0 && newNotifs.length > notifications.length) {
        const latest = newNotifs[0];
        if (!latest.read) {
          showToast(`${latest.title}: ${latest.message}`, 'info');
        }
      }
      
      setNotifications(newNotifs);
    }
  }, [user, notifications, showToast]);

  // Poll for updates in demo mode (since other tabs/simulated users might write to localStorage)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [user, refresh]);

  const addNotification = useCallback(({ type, title, message, link }) => {
    if (!user) return;
    notificationService.create({ userId: user.id, type, title, message, link });
    refresh();
  }, [user, refresh]);

  const markAsRead = useCallback((id) => {
    notificationService.markAsRead(id);
    refresh();
  }, [refresh]);

  const markAllAsRead = useCallback(() => {
    if (!user) return;
    notificationService.markAllAsRead(user.id);
    refresh();
  }, [user, refresh]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, toasts,
      addNotification, markAsRead, markAllAsRead,
      showToast, dismissToast, refresh,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
}

export default NotificationContext;
