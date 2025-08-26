import { IconList, IconGitFork, IconTags } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { TOC } from '../MarkdownViewer/TOC';
import { LocalGraph } from '../Graph/LocalGraph';
import { TagsPanel } from '../MarkdownViewer/TagsPanel';

export function RightSidebar() {
  const { activeRightPanel, setActiveRightPanel } = useUIStore();

  return (
    <div className="h-full flex flex-col bg-[var(--background-secondary)]">
      {/* Tab Headers */}
      <div className="border-b border-[var(--background-modifier-border)]">
        <div className="flex">
          <button
            onClick={() => setActiveRightPanel('outline')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeRightPanel === 'outline'
                ? 'border-[var(--interactive-accent)] text-[var(--interactive-accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-normal)]'
            }`}
          >
            <IconList size={16} className="mr-1" />
            Outline
          </button>
          <button
            onClick={() => setActiveRightPanel('graph')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeRightPanel === 'graph'
                ? 'border-[var(--interactive-accent)] text-[var(--interactive-accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-normal)]'
            }`}
          >
            <IconGitFork size={16} className="mr-1" />
            Graph
          </button>
          <button
            onClick={() => setActiveRightPanel('tags')}
            className={`flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeRightPanel === 'tags'
                ? 'border-[var(--interactive-accent)] text-[var(--interactive-accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-normal)]'
            }`}
          >
            <IconTags size={16} className="mr-1" />
            Tags
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeRightPanel === 'outline' && <TOC />}
        {activeRightPanel === 'graph' && <LocalGraph />}
        {activeRightPanel === 'tags' && <TagsPanel />}
      </div>
    </div>
  );
}