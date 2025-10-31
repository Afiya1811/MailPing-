import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../services/api';

export interface Email {
  id: string;
  gmail_id: string;
  sender_email: string;
  sender_name: string;
  subject: string;
  preview: string;
  received_date: string;
  is_read: boolean;
  is_starred: boolean;
  labels: string[];
}

export interface UseEmailsOptions {
  limit?: number;
  offset?: number;
  filters?: { is_unread?: boolean; is_starred?: boolean };
}

export const useEmails = (options: UseEmailsOptions = {}) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const { limit = 50, offset = 0, filters } = options;

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.listEmails(limit, offset, filters);

      if (!result.success) {
        setError(result.error || 'Failed to fetch emails');
        return;
      }

      setEmails(result.data?.emails || []);
      setTotalCount(result.data?.total_count || 0);
      setHasMore(result.data?.has_more || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [limit, offset, filters]);

  const syncEmails = useCallback(async () => {
    setSyncing(true);
    setError(null);

    try {
      const result = await apiClient.syncEmails();

      if (!result.success) {
        setError(result.error || 'Sync failed');
        return;
      }

      // Refetch emails after sync
      await fetchEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }, [fetchEmails]);

  const updateEmail = useCallback(
    async (
      emailId: string,
      updates: { is_read?: boolean; is_starred?: boolean; is_archived?: boolean }
    ) => {
      try {
        const result = await apiClient.updateEmail(emailId, updates);

        if (!result.success) {
          setError(result.error || 'Failed to update email');
          return false;
        }

        // Update local state
        setEmails((prev) =>
          prev.map((email) =>
            email.id === emailId ? { ...email, ...updates } : email
          )
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update email');
        return false;
      }
    },
    []
  );

  const deleteEmail = useCallback(async (emailId: string) => {
    try {
      const result = await apiClient.deleteEmail(emailId);

      if (!result.success) {
        setError(result.error || 'Failed to delete email');
        return false;
      }

      // Remove from local state
      setEmails((prev) => prev.filter((email) => email.id !== emailId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email');
      return false;
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  return {
    emails,
    loading,
    syncing,
    error,
    totalCount,
    hasMore,
    fetchEmails,
    syncEmails,
    updateEmail,
    deleteEmail,
  };
};
