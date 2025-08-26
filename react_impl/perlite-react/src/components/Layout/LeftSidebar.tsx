import { IconFiles, IconSearch } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { SearchPanel } from '../FileExplorer/SearchPanel';

export function LeftSidebar() {
  const { activeLeftPanel, setActiveLeftPanel } = useUIStore();

  return (
    <div className="h-full flex flex-col bg-[var(--background-secondary)]">
      {/* Tab Headers */}
      <div className="border-b border-[var(--background-modifier-border)]">
        <div className="flex">
          <button
            onClick={() => setActiveLeftPanel('files')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeLeftPanel === 'files'
                ? 'border-[var(--interactive-accent)] text-[var(--interactive-accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-normal)]'
            }`}
          >
            <IconFiles size={16} className="mr-2" />
            Files
          </button>
          <button
            onClick={() => setActiveLeftPanel('search')}
            className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeLeftPanel === 'search'
                ? 'border-[var(--interactive-accent)] text-[var(--interactive-accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-normal)]'
            }`}
          >
            <IconSearch size={16} className="mr-2" />
            Search
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden" style={{ padding: '1rem' }}>
        {activeLeftPanel === 'files' && <FileExplorer />}
        {activeLeftPanel === 'search' && <SearchPanel />}
      </div>
    </div>
  );
}