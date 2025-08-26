import { IconFiles, IconSearch, IconList, IconNetwork, IconTags, IconX } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { SearchPanel } from '../FileExplorer/SearchPanel';
import { TOC } from '../MarkdownViewer/TOC';
import { LocalGraph } from '../Graph/LocalGraph';
import { TagsPanel } from '../MarkdownViewer/TagsPanel';

export function UnifiedMobileDrawer() {
  const {
    mobileDrawerOpen,
    setMobileDrawerOpen,
    activeMobileTab,
    setActiveMobileTab
  } = useUIStore();

  if (!mobileDrawerOpen) return null;

  const tabs = [
    { id: 'files' as const, label: 'Files', icon: IconFiles, component: FileExplorer },
    { id: 'search' as const, label: 'Search', icon: IconSearch, component: SearchPanel },
    { id: 'outline' as const, label: 'Outline', icon: IconList, component: TOC },
    { id: 'graph' as const, label: 'Graph', icon: IconNetwork, component: LocalGraph },
    { id: 'tags' as const, label: 'Tags', icon: IconTags, component: TagsPanel },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeMobileTab)?.component || FileExplorer;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileDrawerOpen(false)}>
      {/* Drawer */}
      <div 
        className="absolute top-0 left-0 right-0 bg-[var(--background-primary)] border-b border-[var(--background-modifier-border)] shadow-lg max-h-[70vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--background-modifier-border)]">
          <h2 className="text-lg font-medium text-[var(--text-normal)]">Navigation</h2>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1 rounded hover:bg-[var(--background-modifier-hover)] transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMobileTab(tab.id)}
              className={`
                flex-1 flex flex-col items-center py-3 px-2 transition-colors
                ${activeMobileTab === tab.id 
                  ? 'bg-[var(--interactive-accent)] text-white' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'
                }
              `}
            >
              <tab.icon size={20} />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}