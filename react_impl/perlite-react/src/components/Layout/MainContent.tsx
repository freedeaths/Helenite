import { useUIStore } from '../../stores/uiStore';
import { useVaultStore } from '../../stores/vaultStore';
import { MarkdownViewer } from '../MarkdownViewer/MarkdownViewer';
import { GlobalGraph } from '../Graph/GlobalGraph';
import { CustomScrollbar } from './CustomScrollbar';
import { ViewHeader } from './ViewHeader';

export function MainContent() {
  const { isMobile, mainContentView } = useUIStore();
  const { activeFile } = useVaultStore();

  return (
    <div className="h-full flex flex-col bg-[var(--background-primary)]">
      {/* Header */}
      <ViewHeader />

      {/* Content */}
      {mainContentView === 'globalGraph' ? (
        <GlobalGraph />
      ) : (
        <CustomScrollbar 
          className={`flex-1 overflow-auto ${
            isMobile ? 'mobile-scrollbar' : 'custom-scrollbar'
          }`}
          showScrollbar={true}
        >
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
        </CustomScrollbar>
      )}
    </div>
  );
}