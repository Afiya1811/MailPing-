import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';
import { Notification } from '../hooks/useNotifications';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

const iconMap = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-400" />,
};

const bgMap = {
  success: 'bg-green-900/20 border-green-700',
  error: 'bg-red-900/20 border-red-700',
  info: 'bg-blue-900/20 border-blue-700',
  warning: 'bg-yellow-900/20 border-yellow-700',
};

export default function NotificationToast({
  notification,
  onClose,
}: NotificationToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`rounded-lg border p-4 flex items-start gap-3 shadow-lg ${bgMap[notification.type]}`}
    >
      {iconMap[notification.type]}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{notification.title}</p>
        <p className="text-gray-300 text-sm">{notification.message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-200"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface NotificationContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export function NotificationContainer({
  notifications,
  onRemove,
}: NotificationContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => onRemove(notification.id)}
        />
      ))}
    </div>
  );
}
