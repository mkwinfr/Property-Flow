import React, { useState, useCallback, useRef, useEffect } from 'react';
import './EnhancedSearch.css';

interface EnhancedSearchProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export const EnhancedSearch: React.FC<EnhancedSearchProps> = ({
  placeholder = 'Search apartments...',
  onSearch,
  debounceMs = 300,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.trim() === '') {
      onSearch('');
      return;
    }

    setIsLoading(true);
    debounceTimer.current = setTimeout(() => {
      onSearch(query);
      setIsLoading(false);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, onSearch, debounceMs]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className="enhanced-search">
      <div className="enhanced-search-input-wrapper">
        <span className="enhanced-search-icon">🔍</span>
        <input
          type="text"
          className="enhanced-search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search"
        />
        {query && (
          <button
            className="enhanced-search-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        {isLoading && (
          <div className="enhanced-search-loading">
            <div className="enhanced-search-spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
};
