import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Mail, RefreshCw, Settings as SettingsIcon, Menu } from 'lucide-react';
import EmailList from '../components/EmailList';
import SearchBar from '../components/SearchBar';
import Settings from '../components/Settings';
import { NotificationContainer } from '../components/NotificationToast';
import { useEmails } from '../hooks/useEmails';
import { useNotifications } from '../hooks/useNotifications';
import { useSearch } from '../hooks/useSearch';
import { storage } from '../services/storage';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<string | undefined>();

  const { emails, loading, syncing, syncEmails, deleteEmail, updateEmail } = useEmails();
  const { notifications, addNotification, removeNotification, requestNotificationPermission } =
    useNotifications();
  const { results: searchResults, search, clearSearch, query } = useSearch();

  // Initial sync on mount
  useEffect(() => {
    const initializeAndSync = async () => {
      try {
        // Request notification permission
        await requestNotificationPermission();

        // Sync emails on first load
        await syncEmails();
        addNotification('Emails synced successfully', 'success', 'Sync Complete');
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    initializeAndSync();
  }, []);

  const user = storage.getUser();

  const handleEmailClick = (email: any) => {
    setSelectedEmail(email.id);
    navigate(`/email/${email.id}`);
  };

  const handleDeleteClick = async (emailId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this email?')) {
      const success = await deleteEmail(emailId);
      if (success) {
        addNotification('Email deleted', 'success');
      }
    }
  };

  const handleStarClick = async (email: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await updateEmail(email.id, { is_starred: !email.is_starred });
    if (success) {
      addNotification(
        email.is_starred ? 'Email unstarred' : 'Email starred',
        'success'
      );
    }
  };

  const displayEmails = query ? searchResults : emails;

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-full">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">MailPing</h1>
            <p className="text-xs text-gray-400">{user?.google_email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => syncEmails()}
            disabled={syncing}
            className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
            title="Sync emails"
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-400 ${syncing ? 'animate-spin' : ''}`}
            />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Email List */}
        <div className="w-full md:w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <SearchBar onSearch={search} onClear={clearSearch} />

          {query && (
            <div className="px-4 py-2 bg-gray-700/50 text-sm text-gray-300">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
            </div>
          )}

          <EmailList
            emails={displayEmails}
            loading={loading}
            onEmailClick={handleEmailClick}
            onDeleteClick={handleDeleteClick}
            onStarClick={handleStarClick}
            selectedEmailId={selectedEmail}
          />

          {displayEmails.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-700 text-xs text-gray-400 text-center">
              {displayEmails.length} email{displayEmails.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-900">
          <div className="text-center">
            <Mail className="w-16 h-16 text-gray-700 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-400 mb-2">Select an email</h2>
            <p className="text-gray-500">Click on an email to read it</p>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Notifications */}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </div>
  );
}
