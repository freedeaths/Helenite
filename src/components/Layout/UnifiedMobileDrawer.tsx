import { IconFiles, IconList, IconNetwork, IconTags, IconX } from '@tabler/icons-react';
import { ActionIcon, Button } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { FileExplorer } from '../FileExplorer/FileExplorer';
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
          <ActionIcon
            onClick={() => setMobileDrawerOpen(false)}
            variant="subtle"
            color="gray"
            size="md"
          >
            <IconX size={20} />
          </ActionIcon>
        </div>

        {/* Tab Bar */}
        <div className="border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-2">
          <Button.Group>
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveMobileTab(tab.id)}
                variant={activeMobileTab === tab.id ? 'filled' : 'light'}
                size="compact-md"
                flex={1}
                styles={{
                  inner: {
                    flexDirection: 'column',
                    gap: '4px'
                  },
                  label: {
                    fontSize: '12px'
                  }
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </Button>
            ))}
          </Button.Group>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}