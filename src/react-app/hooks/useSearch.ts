import { useState, useCallback } from 'react';
import { apiClient } from '../services/api';
import { Email } from './useEmails';

export const useSearch = () => {
  const [results, setResults] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const search = useCallback(
    async (
      searchQuery: string,
      filters?: {
        is_unread?: boolean;
        is_starred?: boolean;
        date_from?: string;
        date_to?: string;
        labels?: string[];
        from?: string;
      }
    ) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setQuery('');
        return;
      }

      setLoading(true);
      setError(null);
      setQuery(searchQuery);

      try {
        const result = await apiClient.searchEmails(searchQuery, filters);

        if (!result.success) {
          setError(result.error || 'Search failed');
          setResults([]);
          return;
        }

        setResults(result.data?.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearSearch = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    query,
    search,
    clearSearch,
  };
};
