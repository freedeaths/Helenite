import { useUIStore } from '../../stores/uiStore';
import { useVaultStore } from '../../stores/vaultStore';
import { MarkdownViewer } from '../MarkdownViewer/MarkdownViewer';
import { GlobalGraph } from '../Graph/GlobalGraph';
import { ViewHeader } from './ViewHeader';

export function MainContent() {
  const { isMobile, mainContentView } = useUIStore();
  const { activeFile } = useVaultStore();

  return (
    <div className="h-full flex flex-col bg-[var(--background-primary)]">
      {/* Header - use sticky positioning within the main content area */}
      <div className="sticky top-0 z-[100] bg-[var(--background-secondary)]">
        <ViewHeader />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mainContentView === 'globalGraph' ? (
          <GlobalGraph />
        ) : (
          <>
            {activeFile ? (
              <MarkdownViewer />
            ) : (
              <div className="flex items-center justify-center h-full min-h-96">
                <div className="text-center text-[var(--text-muted)] max-w-2xl mx-auto px-6">
                  <h2 className="text-2xl font-bold mb-4">Welcome to Helenite</h2>
                  <p>Select a file from the sidebar to get started</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}