import React, { useState } from 'react';
import { Search, X, Filter } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string, filters: any) => void;
  onClear: () => void;
}

export default function SearchBar({ onSearch, onClear }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ is_unread: false, is_starred: false });

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query, filters);
    }
  };

  const handleClear = () => {
    setQuery('');
    setFilters({ is_unread: false, is_starred: false });
    onClear();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="p-4 border-b border-gray-700 bg-gray-800">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search emails..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full bg-gray-700 text-white placeholder-gray-400 rounded-lg py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-400 hover:text-gray-300" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 hover:bg-gray-700 rounded-lg transition"
          title="Toggle filters"
        >
          <Filter className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 p-3 bg-gray-700 rounded-lg space-y-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={filters.is_unread}
              onChange={(e) =>
                setFilters({ ...filters, is_unread: e.target.checked })
              }
              className="w-4 h-4"
            />
            Unread only
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={filters.is_starred}
              onChange={(e) =>
                setFilters({ ...filters, is_starred: e.target.checked })
              }
              className="w-4 h-4"
            />
            Starred only
          </label>
        </div>
      )}
    </div>
  );
}
