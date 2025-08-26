import { IconLayoutSidebar, IconLink, IconChevronDown } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';
import { useVaultStore } from '../../stores/vaultStore';
import { MobileDropdownMenu } from './MobileDropdownMenu';

export function ViewHeader() {
  const { 
    toggleLeftSidebar, 
    toggleRightSidebar, 
    isMobile,
    isTablet,
    leftSidebarOpen,
    rightSidebarOpen,
    mobileDropdownOpen,
    setMobileDropdownOpen
  } = useUIStore();
  const { activeFile } = useVaultStore();

  return (
    <div className="relative">
      <div className="flex items-center justify-between border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] h-10 z-[60]" style={{ padding: '0 0.75rem' }}>
        {/* Left actions */}
        <div className="flex items-center space-x-2">
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
          
          {/* Mobile dropdown toggle */}
          {isMobile && (
            <button
              data-mobile-dropdown-toggle
              onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
              className={`p-1 rounded transition-colors ${
                mobileDropdownOpen 
                  ? 'bg-[var(--background-modifier-border)]' 
                  : 'hover:bg-[var(--background-modifier-border)]'
              }`}
            >
              <IconChevronDown size={18} className={`transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* File title */}
        <div className="flex-1 text-center">
          <span className="text-sm font-normal truncate">
            {activeFile ? activeFile.replace(/^\//, '').replace(/\.md$/, '') : 'Welcome'}
          </span>
        </div>

        {/* Right actions */}
        <div className="flex items-center space-x-2">
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
      
      {/* Mobile dropdown menu */}
      {isMobile && <MobileDropdownMenu />}
    </div>
  );
}