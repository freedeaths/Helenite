import { IconMenu2, IconLayoutSidebar, IconEdit, IconLink } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { useVaultStore } from '../../stores/vaultStore';
import { MarkdownViewer } from '../MarkdownViewer/MarkdownViewer';
import { CustomScrollbar } from './CustomScrollbar';

export function MainContent() {
  const { 
    toggleLeftSidebar, 
    toggleRightSidebar, 
    isMobile,
    isTablet,
    leftSidebarOpen,
    rightSidebarOpen 
  } = useUIStore();
  const { activeFile } = useVaultStore();

  return (
    <div className="h-full flex flex-col bg-[var(--background-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)]" style={{ padding: '0.75rem 1rem' }}>
        {/* Left actions */}
        <div className="flex items-center space-x-2">
          {/* Mobile menu button */}
          {isMobile && (
            <button
              onClick={toggleLeftSidebar}
              className="p-1 rounded hover:bg-[var(--background-modifier-border)] transition-colors"
            >
              <IconMenu2 size={18} />
            </button>
          )}
          
          {/* Desktop sidebar toggle */}
          {!isMobile && (
            <button
              onClick={toggleLeftSidebar}
              className={`p-1 rounded transition-colors ${
                leftSidebarOpen 
                  ? 'bg-[var(--background-modifier-border)]' 
                  : 'hover:bg-[var(--background-modifier-border)]'
              }`}
            >
              <IconLayoutSidebar size={18} />
            </button>
          )}
        </div>

        {/* File title */}
        <div className="flex-1 text-center">
          <h1 className="text-lg font-medium truncate">
            {activeFile ? activeFile.replace(/^\//, '').replace(/\.md$/, '') : 'Welcome'}
          </h1>
        </div>

        {/* Right actions */}
        <div className="flex items-center space-x-2">
          <button className="p-1 rounded hover:bg-[var(--background-modifier-border)] transition-colors">
            <IconEdit size={18} />
          </button>
          <button className="p-1 rounded hover:bg-[var(--background-modifier-border)] transition-colors">
            <IconLink size={18} />
          </button>
          {!isMobile && !isTablet && (
            <button
              onClick={toggleRightSidebar}
              className={`p-1 rounded transition-colors ${
                rightSidebarOpen 
                  ? 'bg-[var(--background-modifier-border)]' 
                  : 'hover:bg-[var(--background-modifier-border)]'
              }`}
            >
              <IconLayoutSidebar size={18} className="rotate-180" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
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
              <h2 className="text-2xl font-bold mb-4">Welcome to Perlite</h2>
              <p>Select a file from the sidebar to get started</p>
            </div>
          </div>
        )}
      </CustomScrollbar>
    </div>
  );
}