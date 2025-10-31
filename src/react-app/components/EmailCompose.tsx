import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { apiClient } from '../services/api';

interface EmailComposeProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: { id: string; from: string; subject: string };
  forwardFrom?: { id: string; subject: string };
  onSent?: () => void;
}

export default function EmailCompose({
  isOpen,
  onClose,
  replyTo,
  forwardFrom,
  onSent,
}: EmailComposeProps) {
  const [to, setTo] = useState(replyTo?.from || '');
  const [subject, setSubject] = useState(
    replyTo ? `Re: ${replyTo.subject}` : forwardFrom ? `Fwd: ${forwardFrom.subject}` : ''
  );
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!to || !body.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setSending(true);
    setError(null);

    try {
      if (replyTo) {
        const result = await apiClient.replyToEmail(replyTo.id, body, undefined);
        if (result.success) {
          onClose();
          onSent?.();
        } else {
          setError(result.error || 'Failed to send reply');
        }
      } else if (forwardFrom) {
        const result = await apiClient.forwardEmail(
          forwardFrom.id,
          [to],
          subject,
          body
        );
        if (result.success) {
          onClose();
          onSent?.();
        } else {
          setError(result.error || 'Failed to forward email');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-gray-800 w-full max-w-2xl rounded-t-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {replyTo ? 'Reply to' : 'Forward'} email
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Compose Form */}
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* To */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">To</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="recipient@example.com"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
              placeholder="Type your message..."
            />
          </div>

          {/* Error */}
          {error && <div className="p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">{error}</div>}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-700 p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
