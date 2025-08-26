import { IconFiles, IconList, IconNetwork, IconTags } from '@tabler/icons-react';
import { Button } from '@mantine/core';
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
        {/* 桌面端添加占位区域，搜索框目标位置 top:35px，原本 top:16px，差距 15px */}
        <div className="bg-[var(--background-secondary)]" style={{ height: '15px' }}>
          {/* 占位区域：再减少 4px，从 19px → 15px，达到目标 35px */}
        </div>
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
      <div className="border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-2">
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