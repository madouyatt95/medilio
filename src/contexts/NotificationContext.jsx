// ── Notification Context ──
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';
import { isDemoMode } from '../config/runtime';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Toasts management (Move before refresh)
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

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const newNotifs = await notificationService.getByUser(user.id);
      setNotifications(prev => {
        if (prev.length === newNotifs.length && (prev.length === 0 || prev[0].id === newNotifs[0].id)) {
          return prev;
        }
        if (prev.length > 0 && newNotifs.length > prev.length && !newNotifs[0].read) {
          setTimeout(() => showToast(`${newNotifs[0].title}: ${newNotifs[0].message}`, 'info'), 0);
        }
        return newNotifs;
      });
    } catch (error) {
      console.error('Notifications indisponibles', error);
    }
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      void refresh();
    } else {
      setNotifications([]);
    }
  }, [user, refresh]);

  useEffect(() => {
    if (!user) return;
    if (isDemoMode) {
      const interval = setInterval(refresh, 5000);
      return () => clearInterval(interval);
    }
    return notificationService.subscribeToUser(user.id, () => void refresh());
  }, [user, refresh]);

  const addNotification = useCallback(async ({ type, title, message, link }) => {
    if (!user) return;
    await notificationService.create({ userId: user.id, type, title, message, link });
    await refresh();
  }, [user, refresh]);

  const markAsRead = useCallback(async (id) => {
    await notificationService.markAsRead(id);
    await refresh();
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await notificationService.markAllAsRead(user.id);
    await refresh();
  }, [user, refresh]);

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
