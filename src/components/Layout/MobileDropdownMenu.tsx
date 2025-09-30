import { IconFiles, IconList, IconNetwork, IconTags, IconHome, IconDice, IconMoon, IconSun, IconSettings } from '@tabler/icons-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button, ActionIcon } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { useVaultStore } from '../../stores/vaultStore';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { TOC } from '../TOC/TOC';
import { LocalGraph } from '../Graph/LocalGraph';
import { TagsPanel } from '../Tags/TagsPanel';
import { getVaultConfig } from '../../config/vaultConfig';
import type { FileTree } from '../../types/vaultTypes';

export function MobileDropdownMenu() {
  const {
    mobileDropdownOpen,
    setMobileDropdownOpen,
    activeMobileTab,
    setActiveMobileTab,
    setMainContentView,
    theme,
    setTheme
  } = useUIStore();
  const { activeFile, fileTree, navigateToFile, navigateToGraph } = useVaultStore();

  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 主题切换
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
    document.dispatchEvent(new CustomEvent('obsidian-theme-changed', {
      detail: { theme: newTheme }
    }));
  }, [theme, setTheme]);

  // 收集所有 markdown 文件
  const collectMarkdownFiles = (fileNodes: FileTree[]): string[] => {
    const mdFiles: string[] = [];
    const traverse = (nodes: FileTree[]) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.path.endsWith('.md')) {
          mdFiles.push(node.path);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(fileNodes);
    return mdFiles;
  };

  // 随机打开一篇文章
  const openRandomNote = useCallback(() => {
    const allMarkdownFiles = collectMarkdownFiles(fileTree);
    if (allMarkdownFiles.length === 0) {
      // console.warn('No markdown files found in vault');
      return;
    }
    const availableFiles = allMarkdownFiles.filter(file => file !== activeFile);
    const filesToChooseFrom = availableFiles.length > 0 ? availableFiles : allMarkdownFiles;
    const randomIndex = Math.floor(Math.random() * filesToChooseFrom.length);
    const randomFile = filesToChooseFrom[randomIndex];
    // console.log(`🎲 Opening random note: ${randomFile}`);
    navigateToFile(randomFile);
    setMainContentView('file');
    setMobileDropdownOpen(false); // 关闭下拉菜单
  }, [fileTree, activeFile, setMainContentView, setMobileDropdownOpen, navigateToFile]);

  // 打开主页
  const goHome = useCallback(() => {
    // 导航到配置的首页文件，与桌面端保持一致
    const config = getVaultConfig();
    navigateToFile(config.indexFile);
    setMainContentView('file');
    setMobileDropdownOpen(false);
  }, [setMainContentView, setMobileDropdownOpen, navigateToFile]);

  // 打开全局图谱
  const openGlobalGraph = useCallback(() => {
    setMainContentView('globalGraph');
    navigateToGraph();
    setMobileDropdownOpen(false);
  }, [setMainContentView, setMobileDropdownOpen, navigateToGraph]);

  // Handle visibility and animation states
  useEffect(() => {
    if (mobileDropdownOpen) {
      setIsVisible(true);
      // Prevent background scrolling but allow dropdown content to scroll
      // Hide scrollbars completely
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift

      // Hide scrollbar on main content container if it exists
      const mainContentElement = document.querySelector('.markdown-viewer') ||
                                 document.querySelector('[data-markdown-container]') ||
                                 document.querySelector('.flex-1.overflow-auto');
      if (mainContentElement) {
        (mainContentElement as HTMLElement).style.overflow = 'hidden';
      }

      // Prevent touch scrolling on background but allow it inside dropdown
      const preventBackgroundTouch = (e: TouchEvent) => {
        const target = e.target as Element;
        const dropdownContent = contentRef.current;

        // Allow touch events inside dropdown content
        if (dropdownContent && dropdownContent.contains(target)) {
          return; // Allow normal touch behavior inside dropdown
        }

        // Prevent touch events on background
        e.preventDefault();
      };

      document.addEventListener('touchmove', preventBackgroundTouch, { passive: false });

      // Use requestAnimationFrame for more reliable rendering timing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });

      return () => {
        document.removeEventListener('touchmove', preventBackgroundTouch);
      };
    } else {
      setIsAnimating(false);
      // Restore scrolling when dropdown is closed
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.paddingRight = '';

      // Restore scrollbar on main content container
      const mainContentElement = document.querySelector('.markdown-viewer') ||
                                 document.querySelector('[data-markdown-container]') ||
                                 document.querySelector('.flex-1.overflow-auto');
      if (mainContentElement) {
        (mainContentElement as HTMLElement).style.overflow = '';
      }
      // Use transitionend event instead of setTimeout for more reliable cleanup
      const cleanup = setTimeout(() => setIsVisible(false), 250); // Slightly longer timeout
      return () => clearTimeout(cleanup);
    }
  }, [mobileDropdownOpen]);

  // Handle click outside to close
  useEffect(() => {
    if (!mobileDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the dropdown content and not on the toggle button
      const target = event.target as Element;
      const isToggleButton = target.closest('[data-mobile-dropdown-toggle]');

      if (contentRef.current && !contentRef.current.contains(target) && !isToggleButton) {
        setMobileDropdownOpen(false);
      }
    };

    // Add event listener to document to catch all clicks
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileDropdownOpen, setMobileDropdownOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  if (!isVisible) return null;

  const tabs = [
    { id: 'files' as const, label: 'Files', icon: IconFiles, component: FileExplorer },
    { id: 'outline' as const, label: 'Outline', icon: IconList, component: TOC },
    { id: 'graph' as const, label: 'Graph', icon: IconNetwork, component: LocalGraph },
    { id: 'tags' as const, label: 'Tags', icon: IconTags, component: TagsPanel },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeMobileTab)?.component || FileExplorer;

  return (
    <div
      ref={overlayRef}
      className="fixed left-0 right-0 bottom-0 bg-black/30"
      style={{
        top: '40px', // Start from below ViewHeader (40px height)
        zIndex: 999999 // Much higher z-index
      }}
    >
      {/* Dropdown Content */}
      <div
        ref={contentRef}
        className="absolute top-0 left-0 right-0 bg-[var(--background-primary)] border-b border-[var(--background-modifier-border)] shadow-lg max-h-[60vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: isAnimating ? '60vh' : '0',
          opacity: isAnimating ? 1 : 0,
          transition: 'max-height 0.2s ease-out, opacity 0.2s ease-out',
          overflow: 'hidden',
          width: '100%',
          zIndex: 1000000 // Even higher z-index for content
        }}
      >
        {/* Function Buttons Row */}
        <div className="border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] py-1 px-3">
          <div className="flex justify-center space-x-3">
            {/* Home */}
            <ActionIcon
              onClick={goHome}
              variant="subtle"
              color="gray"
              size="sm"
              radius="md"
            >
              <IconHome size={16} />
            </ActionIcon>

            {/* Global Graph */}
            <ActionIcon
              onClick={openGlobalGraph}
              variant="subtle"
              color="gray"
              size="sm"
              radius="md"
            >
              <IconNetwork size={16} />
            </ActionIcon>

            {/* Random Note */}
            <ActionIcon
              onClick={openRandomNote}
              variant="subtle"
              color="gray"
              size="sm"
              radius="md"
            >
              <IconDice size={16} />
            </ActionIcon>

            {/* Theme Toggle */}
            <ActionIcon
              onClick={toggleTheme}
              variant="subtle"
              color="gray"
              size="sm"
              radius="md"
            >
              {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
            </ActionIcon>

            {/* Settings */}
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius="md"
            >
              <IconSettings size={16} />
            </ActionIcon>
          </div>
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
                <tab.icon size={16} />
                {tab.label}
              </Button>
            ))}
          </Button.Group>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          <ActiveComponent />
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}