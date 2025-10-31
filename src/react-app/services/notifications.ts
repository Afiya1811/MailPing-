export const notificationService = {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Browser does not support desktop notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  },

  showDesktopNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/mailping-icon.png',
        ...options,
      });
    }
  },

  showToastNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Toast notifications are handled by React components
    // Dispatch custom event that components can listen to
    const event = new CustomEvent('toast', {
      detail: { message, type },
    });
    window.dispatchEvent(event);
  },

  isNotificationSupported(): boolean {
    return 'Notification' in window;
  },

  hasPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  },
};
