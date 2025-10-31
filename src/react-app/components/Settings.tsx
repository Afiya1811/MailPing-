import React, { useState } from 'react';
import { Settings as SettingsIcon, LogOut, Bell, X } from 'lucide-react';
import { useGmailAuth } from '../hooks/useGmailAuth';
import { useNotifications } from '../hooks/useNotifications';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const { logout } = useGmailAuth();
  const { hasPermission, requestNotificationPermission } = useNotifications();
  const [enableNotifications, setEnableNotifications] = useState(hasPermission);

  const handleNotificationsToggle = async () => {
    if (!enableNotifications) {
      const granted = await requestNotificationPermission();
      setEnableNotifications(granted);
    } else {
      setEnableNotifications(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-gray-800 w-full max-w-md rounded-t-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Settings */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="text-white">Desktop Notifications</span>
            </div>
            <button
              onClick={handleNotificationsToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                enableNotifications ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enableNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <p className="text-sm text-gray-400 mb-3">About MailPing</p>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">Version 1.0.0</p>
              <p className="text-gray-400">Gmail Integration</p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="border-t border-gray-700 p-4">
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
