import { IconFiles, IconList, IconNetwork, IconTags } from '@tabler/icons-react';
import { Button } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { TOC } from '../MarkdownViewer/TOC';
import { LocalGraph } from '../Graph/LocalGraph';
import { TagsPanel } from '../MarkdownViewer/TagsPanel';

export function LeftSidebar() {
  const { activeMobileTab, setActiveMobileTab, activeLeftPanel, setActiveLeftPanel, isMobile, isTablet } = useUIStore();

  // 桌面端显示 Files + Tags 切换
  if (!isMobile && !isTablet) {
    return (
      <div className="h-full flex flex-col bg-[var(--background-secondary)]">
        {/* Desktop Tab Headers */}
        <div className="border-b border-[var(--background-modifier-border)] p-2 h-10 flex items-center">
          <Button.Group className="w-full">
            <Button
              onClick={() => setActiveLeftPanel('files')}
              variant={activeLeftPanel === 'files' ? 'filled' : 'light'}
              leftSection={<IconFiles size={16} />}
              size="compact-sm"
              className="flex-1"
            >
              Files
            </Button>
            <Button
              onClick={() => setActiveLeftPanel('tags')}
              variant={activeLeftPanel === 'tags' ? 'filled' : 'light'}
              leftSection={<IconTags size={16} />}
              size="compact-sm"
              className="flex-1"
            >
              Tags
            </Button>
          </Button.Group>
        </div>

        {/* Desktop Content */}
        <div className="flex-1 overflow-hidden" style={{ padding: '1rem' }}>
          {activeLeftPanel === 'files' && <FileExplorer />}
          {activeLeftPanel === 'tags' && <TagsPanel />}
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
      <div className="border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-2 h-10 flex items-center">
        <Button.Group>
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveMobileTab(tab.id)}
              variant={activeMobileTab === tab.id ? 'filled' : 'light'}
              size="compact-sm"
              flex={1}
              styles={{
                inner: {
                  flexDirection: 'column',
                  gap: '4px'
                },
                label: {
                  fontSize: '11px'
                }
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </Button>
          ))}
        </Button.Group>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ padding: '0.25rem 1rem 1rem 1rem' }}>
        <ActiveComponent />
      </div>
    </div>
  );
}