import { IconList, IconGitFork } from '@tabler/icons-react';
import { Button } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { TOC } from '../TOC/TOC';
import { LocalGraph } from '../Graph/LocalGraph';

export function RightSidebar() {
  const { activeRightPanel, setActiveRightPanel } = useUIStore();

  return (
    <div className="h-full flex flex-col bg-[var(--background-secondary)]">
      {/* Tab Headers */}
      <div className="border-b border-[var(--background-modifier-border)] p-2 h-10 flex items-center">
        <Button.Group className="w-full">
          <Button
            onClick={() => setActiveRightPanel('outline')}
            variant={activeRightPanel === 'outline' ? 'filled' : 'light'}
            leftSection={<IconList size={16} />}
            size="compact-sm"
            className="flex-1"
          >
            Outline
          </Button>
          <Button
            onClick={() => setActiveRightPanel('graph')}
            variant={activeRightPanel === 'graph' ? 'filled' : 'light'}
            leftSection={<IconGitFork size={16} />}
            size="compact-sm"
            className="flex-1"
          >
            Graph
          </Button>
        </Button.Group>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeRightPanel === 'outline' && <TOC />}
        {activeRightPanel === 'graph' && <LocalGraph />}
      </div>
    </div>
  );
}