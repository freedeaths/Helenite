import { useState, useEffect, useMemo } from 'react';
import { IconSearch, IconFile, IconHash } from '@tabler/icons-react';
import { useVaultStore } from '../../stores/vaultStore';
import { useSearch } from '../../apis/hooks/useSearchAPI';
import type { SearchResult } from '../../apis/interfaces/ISearchAPI';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const { setCurrentFile } = useVaultStore();
  const { search } = useSearch();

  // 实时搜索（防抖）
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await search(query);
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms 防抖

    return () => clearTimeout(timeoutId);
  }, [query, search]);

  // 点击搜索结果项
  const handleResultClick = (filePath: string) => {
    setCurrentFile(filePath);
  };

  // 判断是否为标签搜索
  const isTagSearch = query.startsWith('#');

  return (
    <div className="h-full flex flex-col">
      {/* Search Input */}
      <div className="p-4 border-b border-[var(--background-modifier-border)]">
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search files or #tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--background-primary)] border border-[var(--background-modifier-border)] rounded text-sm focus:outline-none focus:border-[var(--interactive-accent)]"
          />
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-auto">
        {isSearching ? (
          <div className="p-4 text-sm text-[var(--text-muted)]">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-[var(--interactive-accent)] border-t-transparent rounded-full"></div>
              Searching...
            </div>
          </div>
        ) : query ? (
          results.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-[var(--text-muted)] mb-2 px-2">
                {results.length} result{results.length !== 1 ? 's' : ''} 
                {isTagSearch ? ' for tag' : ''} "{query}"
              </div>
              {results.map((result, index) => (
                <div
                  key={`${result.filePath}-${index}`}
                  className="mb-4 border border-[var(--background-modifier-border)] rounded-lg overflow-hidden hover:border-[var(--interactive-accent)] transition-colors"
                >
                  {/* File Header */}
                  <div
                    className="p-3 bg-[var(--background-secondary)] border-b border-[var(--background-modifier-border)] cursor-pointer hover:bg-[var(--background-modifier-hover)] transition-colors"
                    onClick={() => handleResultClick(result.filePath)}
                  >
                    <div className="flex items-center gap-2">
                      {isTagSearch ? (
                        <IconHash size={14} className="text-[var(--interactive-accent)]" />
                      ) : (
                        <IconFile size={14} className="text-[var(--text-muted)]" />
                      )}
                      <span className="text-sm font-medium text-[var(--text-normal)]">
                        {result.fileName}
                      </span>
                      <span className="text-xs text-[var(--text-muted)] ml-auto">
                        {result.matchCount} match{result.matchCount !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">
                      {result.filePath}
                    </div>
                  </div>

                  {/* Matches */}
                  <div className="max-h-48 overflow-auto">
                    {result.matches.slice(0, 5).map((match, matchIndex) => (
                      <div
                        key={matchIndex}
                        className="p-3 border-b border-[var(--background-modifier-border)] last:border-b-0 hover:bg-[var(--background-modifier-hover)] transition-colors"
                        onClick={() => handleResultClick(result.filePath)}
                      >
                        <div className="text-xs text-[var(--text-muted)] mb-1">
                          {match.lineNumber && `Line ${match.lineNumber}`}
                        </div>
                        <div 
                          className="text-sm text-[var(--text-normal)] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: match.highlighted }}
                        />
                      </div>
                    ))}
                    {result.matches.length > 5 && (
                      <div className="p-2 text-center text-xs text-[var(--text-muted)]">
                        +{result.matches.length - 5} more matches
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-[var(--text-muted)]">
              No results found for "{query}"
            </div>
          )
        ) : (
          <div className="p-4 text-sm text-[var(--text-muted)]">
            <div className="space-y-2">
              <div>Type to start searching files...</div>
              <div className="text-xs">
                • Search content: <span className="font-mono bg-[var(--background-secondary)] px-1 rounded">hello world</span>
              </div>
              <div className="text-xs">
                • Search tags: <span className="font-mono bg-[var(--background-secondary)] px-1 rounded">#obsidian</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}