import { IconFiles, IconList, IconNetwork, IconTags, IconX } from '@tabler/icons-react';
import { ActionIcon, Button } from '@mantine/core';
import { useNewUIStore } from '../../newStores/newUIStore';
import { NewFileExplorer } from '../FileExplorer/NewFileExplorer';
import { NewTOC } from '../TOC/NewTOC';
import { NewLocalGraph } from '../Graph/NewLocalGraph';
import { NewTagsPanel } from '../Tags/NewTagsPanel';

export function NewUnifiedMobileDrawer() {
  const {
    mobileDrawerOpen,
    setMobileDrawerOpen,
    activeMobileTab,
    setActiveMobileTab
  } = useNewUIStore();

  if (!mobileDrawerOpen) return null;

  const tabs = [
    { id: 'files' as const, label: 'Files', icon: IconFiles, component: NewFileExplorer },
    { id: 'outline' as const, label: 'Outline', icon: IconList, component: NewTOC },
    { id: 'graph' as const, label: 'Graph', icon: IconNetwork, component: NewLocalGraph },
    { id: 'tags' as const, label: 'Tags', icon: IconTags, component: NewTagsPanel },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeMobileTab)?.component || NewFileExplorer;

  return (
    <div className="fixed inset-0 z-50 bg-black/50" data-testid="mobile-drawer" onClick={() => setMobileDrawerOpen(false)}>
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