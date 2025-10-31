import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { storage } from '../services/storage';
import { apiClient } from '../services/api';

export const useGmailAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if token is in URL (from OAuth callback)
        const urlToken = searchParams.get('token');
        if (urlToken) {
          storage.setToken(urlToken);
          setIsAuthenticated(true);
          navigate('/dashboard', { replace: true });
          setLoading(false);
          return;
        }

        // Check if token exists in storage
        const token = storage.getToken();
        if (token) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Auth initialization failed');
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [navigate, searchParams]);

  const getGoogleAuthUrl = (redirectAfterAuth: string = '/dashboard'): string => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    const redirectUri = `${window.location.origin}/auth`;
    const scope = encodeURIComponent(
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify'
    );
    const state = encodeURIComponent(redirectAfterAuth);

    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      storage.clear();
      setIsAuthenticated(false);
      navigate('/auth', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  };

  return {
    isAuthenticated,
    loading,
    error,
    getGoogleAuthUrl,
    logout,
  };
};
