// ── Notification Context ──
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import notificationService from '../services/notificationService';
import { useAuth } from './AuthContext';

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

  const refresh = useCallback(() => {
    if (!user) return;
    
    const newNotifs = notificationService.getByUser(user.id);
    
    setNotifications(prev => {
      // Avoid infinite loop: if content is same, don't update state
      if (prev.length === newNotifs.length && (prev.length === 0 || prev[0].id === newNotifs[0].id)) {
        return prev;
      }

      // Detect new unread notification for toast
      if (prev.length > 0 && newNotifs.length > prev.length) {
        const latest = newNotifs[0];
        if (!latest.read) {
          // Trigger toast safely
          setTimeout(() => {
            showToast(`${latest.title}: ${latest.message}`, 'info');
          }, 0);
        }
      }
      
      return newNotifs;
    });
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setNotifications([]);
    }
  }, [user, refresh]);

  // Poll for updates in demo mode
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
