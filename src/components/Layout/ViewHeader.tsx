import { IconLayoutSidebar, IconChevronDown } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { useVaultStore } from '../../stores/vaultStore';
import { MobileDropdownMenu } from './MobileDropdownMenu';
import { ShareButton } from '../Share';

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
      <div className="flex items-center justify-between border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] h-10" style={{ padding: '0 0.75rem' }}>
        {/* Left actions */}
        <div className="flex items-center space-x-2">
          {/* Desktop sidebar toggle */}
          {!isMobile && (
            <ActionIcon
              onClick={toggleLeftSidebar}
              variant={leftSidebarOpen ? 'light' : 'subtle'}
              color="gray"
              size="sm"
            >
              <IconLayoutSidebar size={18} />
            </ActionIcon>
          )}
          
          {/* Mobile dropdown toggle */}
          {isMobile && (
            <ActionIcon
              data-mobile-dropdown-toggle
              onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)}
              variant={mobileDropdownOpen ? 'light' : 'subtle'}
              color="gray"
              size="sm"
            >
              <IconChevronDown size={18} className={`transition-transform ${mobileDropdownOpen ? 'rotate-180' : ''}`} />
            </ActionIcon>
          )}
        </div>

        {/* File title */}
        <div className="flex-1 text-center min-w-0 px-2 overflow-hidden">
          <div className="text-sm font-normal truncate whitespace-nowrap">
            {activeFile ? decodeURIComponent(activeFile).replace(/^\//, '').replace(/\.md$/, '') : 'Welcome'}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <ShareButton size="sm" variant="subtle" />
          {!isMobile && !isTablet && (
            <ActionIcon
              onClick={toggleRightSidebar}
              variant={rightSidebarOpen ? 'light' : 'subtle'}
              color="gray"
              size="sm"
            >
              <IconLayoutSidebar size={18} className="rotate-180" />
            </ActionIcon>
          )}
        </div>
      </div>
      
      {/* Mobile dropdown menu */}
      {isMobile && <MobileDropdownMenu />}
    </div>
  );
}