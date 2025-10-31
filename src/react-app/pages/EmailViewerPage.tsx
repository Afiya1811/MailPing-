import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Star, Trash2, Reply, Forward } from 'lucide-react';
import { apiClient } from '../services/api';
import DOMPurify from 'dompurify';

interface EmailDetail {
  id: string;
  subject: string;
  from: string;
  date: string;
  body_html: string | null;
  body_plain: string | null;
  attachments: any[];
  is_read: boolean;
  is_starred: boolean;
}

export default function EmailViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmail = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const result = await apiClient.getEmail(id);
        if (result.success && result.data) {
          setEmail(result.data);
        } else {
          setError(result.error || 'Failed to load email');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load email');
      } finally {
        setLoading(false);
      }
    };

    fetchEmail();
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !email) {
    return (
      <div className="h-screen bg-gray-900 flex flex-col items-center justify-center">
        <p className="text-red-400 mb-4">{error || 'Email not found'}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-700 rounded-lg transition">
            <Star className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 hover:bg-red-600/20 rounded-lg transition">
            <Trash2 className="w-5 h-5 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Subject */}
          <h1 className="text-3xl font-bold text-white mb-4">{email.subject}</h1>

          {/* Metadata */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <p className="text-white font-semibold">{email.from}</p>
            <p className="text-gray-400 text-sm">
              {new Date(email.date).toLocaleString()}
            </p>
          </div>

          {/* Body */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
            {email.body_html ? (
              <div
                className="prose prose-invert max-w-none text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(email.body_html, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'img'] }),
                }}
              />
            ) : (
              <p className="text-gray-300 whitespace-pre-wrap">{email.body_plain}</p>
            )}
          </div>

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-semibold mb-3">
                Attachments ({email.attachments.length})
              </h3>
              <div className="space-y-2">
                {email.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-gray-700 rounded"
                  >
                    <span className="text-gray-300 text-sm truncate">
                      {attachment.filename}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">
                      {(attachment.size / 1024).toFixed(2)} KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply/Forward Actions */}
          <div className="mt-6 flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
              <Reply className="w-4 h-4" />
              Reply
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition">
              <Forward className="w-4 h-4" />
              Forward
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
