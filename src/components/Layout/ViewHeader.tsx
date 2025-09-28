import React from 'react';
import { IconLayoutSidebar, IconChevronDown } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore.js';
import { useVaultStore } from '../../stores/vaultStore.js';
import { ShareButton } from '../Share/ShareButton.js';

/**
 * 新架构视图头部组件 - 基于 VaultService 的数据访问
 * 复制老版本功能，包含文件标题显示和侧边栏切换
 */
export function ViewHeader() {
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
    isMobile,
    isTablet,
    leftSidebarOpen,
    rightSidebarOpen,
    setMobileLeftDrawerOpen,
    setMobileRightDrawerOpen,
    mobileDropdownOpen,
    setMobileDropdownOpen
  } = useUIStore();
  const { activeFile } = useVaultStore();

  // 获取文件显示名称
  const getFileDisplayName = (filePath: string | null): string => {
    if (!filePath) return 'Welcome to Helenite';
    return decodeURIComponent(filePath)
      .replace(/^\//, '') // 移除开头的斜杠
      .replace(/\.md$/, '') // 移除 .md 扩展名
      .split('/')
      .pop() || 'Unknown'; // 只显示文件名，不显示路径
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] h-10" style={{ padding: '0 0.75rem' }}>
        {/* Left actions */}
        <div className="flex items-center space-x-2">
          {/* Desktop sidebar toggle - 完全复制老版本 */}
          {!isMobile && (
            <ActionIcon
              data-testid="toggle-left-sidebar"
              onClick={toggleLeftSidebar}
              variant={leftSidebarOpen ? 'light' : 'subtle'}
              color="gray"
              size="sm"
            >
              <IconLayoutSidebar size={18} />
            </ActionIcon>
          )}

          {/* Mobile dropdown toggle - 完全复制老版本 */}
          {isMobile && (
            <ActionIcon
              data-testid="mobile-dropdown-button"
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

        {/* File title - 完全复制老版本样式 */}
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
    </div>
  );
}