import React from 'react';
import { Star, Trash2 } from 'lucide-react';
import { Email } from '../hooks/useEmails';
import { formatDistanceToNow } from 'date-fns';

interface EmailListProps {
  emails: Email[];
  loading: boolean;
  onEmailClick: (email: Email) => void;
  onDeleteClick: (emailId: string, e: React.MouseEvent) => void;
  onStarClick: (email: Email, e: React.MouseEvent) => void;
  selectedEmailId?: string;
}

export default function EmailList({
  emails,
  loading,
  onEmailClick,
  onDeleteClick,
  onStarClick,
  selectedEmailId,
}: EmailListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No emails yet</p>
          <p className="text-sm">Sync your emails to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-700 h-full overflow-y-auto">
      {emails.map((email) => (
        <div
          key={email.id}
          onClick={() => onEmailClick(email)}
          className={`p-4 hover:bg-gray-700/50 cursor-pointer transition border-l-4 ${
            selectedEmailId === email.id
              ? 'bg-gray-700 border-l-blue-500'
              : 'border-l-transparent'
          } ${email.is_read ? 'opacity-75' : ''}`}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm truncate ${
                  email.is_read ? 'text-gray-400' : 'text-white font-semibold'
                }`}
              >
                {email.sender_name || email.sender_email}
              </p>
              <p
                className={`text-sm truncate mt-1 ${
                  email.is_read ? 'text-gray-500' : 'text-gray-300'
                }`}
              >
                {email.subject}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => onStarClick(email, e)}
                className="p-1 hover:bg-gray-600 rounded transition"
                title={email.is_starred ? 'Unstar' : 'Star'}
              >
                <Star
                  className={`w-4 h-4 ${
                    email.is_starred ? 'text-yellow-400 fill-current' : 'text-gray-500'
                  }`}
                />
              </button>
              <button
                onClick={(e) => onDeleteClick(email.id, e)}
                className="p-1 hover:bg-red-600/20 rounded transition"
                title="Delete"
              >
                <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2 truncate">{email.preview}</p>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              {!email.is_read && (
                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
              )}
            </div>
            <time className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(email.received_date), { addSuffix: false })}
            </time>
          </div>
        </div>
      ))}
    </div>
  );
}
