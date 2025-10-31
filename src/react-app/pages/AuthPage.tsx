import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Mail, LogIn } from 'lucide-react';
import { useGmailAuth } from '../hooks/useGmailAuth';
import { storage } from '../services/storage';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getGoogleAuthUrl, isAuthenticated } = useGmailAuth();

  useEffect(() => {
    // If token is in URL, handle it
    const token = searchParams.get('token');
    if (token) {
      storage.setToken(token);
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, navigate]);

  if (isAuthenticated) {
    return null; // Will redirect via App.tsx
  }

  const handleGoogleLogin = () => {
    const authUrl = getGoogleAuthUrl('/dashboard');
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Mail className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">MailPing</h1>
          <p className="text-gray-400">Stay connected with your emails</p>
        </div>

        {/* Auth Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome back</h2>
            <p className="text-gray-400 text-sm">
              Sign in with your Google account to access MailPing
            </p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 mb-4"
          >
            <LogIn className="w-5 h-5" />
            Sign in with Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800 text-gray-400">Quick start</span>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-600/20 text-blue-400">
                ✓
              </div>
              <span className="text-gray-300">View all your emails in one place</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-600/20 text-blue-400">
                ✓
              </div>
              <span className="text-gray-300">Get instant notifications for new emails</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full bg-blue-600/20 text-blue-400">
                ✓
              </div>
              <span className="text-gray-300">Organize and manage your messages</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-xs">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
