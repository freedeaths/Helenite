import { IconFiles, IconList, IconNetwork, IconTags } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { TOC } from '../MarkdownViewer/TOC';
import { LocalGraph } from '../Graph/LocalGraph';
import { TagsPanel } from '../MarkdownViewer/TagsPanel';

export function LeftSidebar() {
  const { activeMobileTab, setActiveMobileTab, isMobile, isTablet } = useUIStore();

  // 桌面端只显示 Files
  if (!isMobile && !isTablet) {
    return (
      <div className="h-full flex flex-col bg-[var(--background-secondary)]">
        <div className="flex-1 overflow-hidden" style={{ padding: '1rem' }}>
          <FileExplorer />
        </div>
      </div>
    );
  }

  // 平板端显示标签切换
  const tabs = [
    { id: 'files' as const, label: 'Files', icon: IconFiles, component: FileExplorer },
    { id: 'outline' as const, label: 'Outline', icon: IconList, component: TOC },
    { id: 'graph' as const, label: 'Graph', icon: IconNetwork, component: LocalGraph },
    { id: 'tags' as const, label: 'Tags', icon: IconTags, component: TagsPanel },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeMobileTab)?.component || FileExplorer;

  return (
    <div className="h-full flex flex-col bg-[var(--background-secondary)]">
      {/* Tab Bar - 只在平板端显示 */}
      <div className="flex border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveMobileTab(tab.id)}
            className={`
              flex-1 flex flex-col items-center py-3 px-2 transition-colors min-w-0
              ${activeMobileTab === tab.id 
                ? 'bg-[var(--interactive-accent)] text-white' 
                : 'text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'
              }
            `}
          >
            <tab.icon size={18} />
            <span className="text-xs mt-1 font-medium truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ padding: '1rem' }}>
        <ActiveComponent />
      </div>
    </div>
  );
}