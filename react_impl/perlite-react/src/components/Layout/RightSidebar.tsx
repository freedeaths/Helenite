import { IconList, IconGitFork, IconTags } from '@tabler/icons-react';
import { Button } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { TOC } from '../MarkdownViewer/TOC';
import { LocalGraph } from '../Graph/LocalGraph';
import { TagsPanel } from '../MarkdownViewer/TagsPanel';

export function RightSidebar() {
  const { activeRightPanel, setActiveRightPanel } = useUIStore();

  return (
    <div className="h-full flex flex-col bg-[var(--background-secondary)]">
      {/* Tab Headers */}
      <div className="border-b border-[var(--background-modifier-border)] p-2">
        <Button.Group>
          <Button
            onClick={() => setActiveRightPanel('outline')}
            variant={activeRightPanel === 'outline' ? 'filled' : 'light'}
            leftSection={<IconList size={16} />}
            size="compact-sm"
            flex={1}
          >
            Outline
          </Button>
          <Button
            onClick={() => setActiveRightPanel('graph')}
            variant={activeRightPanel === 'graph' ? 'filled' : 'light'}
            leftSection={<IconGitFork size={16} />}
            size="compact-sm"
            flex={1}
          >
            Graph
          </Button>
          <Button
            onClick={() => setActiveRightPanel('tags')}
            variant={activeRightPanel === 'tags' ? 'filled' : 'light'}
            leftSection={<IconTags size={16} />}
            size="compact-sm"
            flex={1}
          >
            Tags
          </Button>
        </Button.Group>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden" style={{ padding: '1rem' }}>
        {activeRightPanel === 'outline' && <TOC />}
        {activeRightPanel === 'graph' && <LocalGraph />}
        {activeRightPanel === 'tags' && <TagsPanel />}
      </div>
    </div>
  );
}