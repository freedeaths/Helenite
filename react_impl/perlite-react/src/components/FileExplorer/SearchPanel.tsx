import { useState } from 'react';
import { IconSearch } from '@tabler/icons-react';
import { useVaultStore } from '../../stores/vaultStore';

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const { isSearching } = useVaultStore();

  return (
    <div className="h-full flex flex-col">
      {/* Search Input */}
      <div className="p-4 border-b border-[var(--background-modifier-border)]">
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Type to start search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--background-primary)] border border-[var(--background-modifier-border)] rounded text-sm focus:outline-none focus:border-[var(--interactive-accent)]"
          />
        </div>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-auto p-4">
        {isSearching ? (
          <div className="text-sm text-[var(--text-muted)]">Searching...</div>
        ) : query ? (
          <div className="text-sm text-[var(--text-muted)]">
            Search functionality will be implemented here
          </div>
        ) : (
          <div className="text-sm text-[var(--text-muted)]">
            Type to start searching
          </div>
        )}
      </div>
    </div>
  );
}