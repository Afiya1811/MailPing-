import { useEffect, useState, useCallback } from 'react';
import { notificationService } from '../services/notifications';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

const POLL_INTERVAL = 30000; // 30 seconds

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const addNotification = useCallback(
    (
      message: string,
      type: 'success' | 'error' | 'info' | 'warning' = 'info',
      title: string = 'MailPing'
    ) => {
      const id = Math.random().toString(36).substr(2, 9);
      const notification: Notification = {
        id,
        title,
        message,
        type,
        timestamp: Date.now(),
      };

      setNotifications((prev) => [...prev, notification]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);

      // Show desktop notification if available
      if (hasPermission && 'Notification' in window) {
        notificationService.showDesktopNotification(title, {
          body: message,
          tag: id,
        });
      }

      return id;
    },
    [hasPermission]
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    try {
      const granted = await notificationService.requestPermission();
      setHasPermission(granted);
      if (granted) {
        addNotification('Notifications enabled', 'success', 'Permission granted');
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
  }, [addNotification]);

  // Setup notification permission on mount
  useEffect(() => {
    if (notificationService.isNotificationSupported()) {
      setHasPermission(notificationService.hasPermission());
    }
  }, []);

  // Listen for new email events from custom events
  useEffect(() => {
    const handleNewEmail = (event: any) => {
      const { email } = event.detail;
      addNotification(
        `New email from ${email.sender_name || email.sender_email}: ${email.subject}`,
        'info',
        'New Email'
      );
      setUnreadCount((prev) => prev + 1);
    };

    window.addEventListener('new-email', handleNewEmail);
    return () => window.removeEventListener('new-email', handleNewEmail);
  }, [addNotification]);

  return {
    notifications,
    unreadCount,
    hasPermission,
    addNotification,
    removeNotification,
    requestNotificationPermission,
    setUnreadCount,
  };
};
