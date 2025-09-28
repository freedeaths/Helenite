/**
 * 新架构 UI 状态管理
 * 复制老版本功能，基于 VaultService
 */
import { create } from 'zustand';

export interface UIState {
  // Layout state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;

  // Responsive state
  isMobile: boolean;
  isTablet: boolean;

  // Mobile drawer state
  mobileLeftDrawerOpen: boolean;
  mobileRightDrawerOpen: boolean;

  // Mobile dropdown state (老版本兼容)
  mobileDropdownOpen: boolean;
  activeMobileTab: 'files' | 'outline' | 'graph' | 'tags';

  // Active panels
  activeLeftPanel: 'files' | 'search' | 'tags';
  activeRightPanel: 'toc' | 'graph' | 'tags' | 'backlinks';

  // Main content view - 复制原版设计
  mainContentView: 'file' | 'globalGraph';

  // Theme
  theme: 'light' | 'dark';

  // Actions
  setLeftSidebarOpen: (open: boolean) => void;
  setRightSidebarOpen: (open: boolean) => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsTablet: (isTablet: boolean) => void;
  setMobileLeftDrawerOpen: (open: boolean) => void;
  setMobileRightDrawerOpen: (open: boolean) => void;
  setMobileDropdownOpen: (open: boolean) => void;
  setActiveMobileTab: (tab: 'files' | 'outline' | 'graph' | 'tags') => void;
  setActiveLeftPanel: (panel: 'files' | 'search' | 'tags') => void;
  setActiveRightPanel: (panel: 'toc' | 'graph' | 'tags' | 'backlinks') => void;
  setMainContentView: (view: 'file' | 'globalGraph') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
}

// Helper function to get initial theme
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';

  // Check localStorage first
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || savedTheme === 'light') {
    return savedTheme;
  }

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
};

export const useUIStore = create<UIState>((set, get) => ({
  // Initial state - 复制老版本默认值
  leftSidebarOpen: true,
  rightSidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
  leftSidebarWidth: 320,
  rightSidebarWidth: 280,

  isMobile: false,
  isTablet: false,

  mobileLeftDrawerOpen: false,
  mobileRightDrawerOpen: false,

  mobileDropdownOpen: false,
  activeMobileTab: 'files',

  activeLeftPanel: 'files',
  activeRightPanel: 'outline',

  mainContentView: 'file',

  theme: getInitialTheme(),

  // Actions
  setLeftSidebarOpen: (open) => set({ leftSidebarOpen: open }),
  setRightSidebarOpen: (open) => set({ rightSidebarOpen: open }),
  setLeftSidebarWidth: (width) => set({ leftSidebarWidth: Math.max(200, Math.min(600, width)) }),
  setRightSidebarWidth: (width) => set({ rightSidebarWidth: Math.max(200, Math.min(500, width)) }),
  setIsMobile: (isMobile) => set({ isMobile }),
  setIsTablet: (isTablet) => set({ isTablet }),
  setMobileLeftDrawerOpen: (open) => set({ mobileLeftDrawerOpen: open }),
  setMobileRightDrawerOpen: (open) => set({ mobileRightDrawerOpen: open }),
  setMobileDropdownOpen: (open) => set({ mobileDropdownOpen: open }),
  setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),
  setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel }),
  setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),
  setMainContentView: (view) => set({ mainContentView: view }),
  setTheme: (theme) => {
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
    set({ theme });
  },
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  toggleRightSidebar: () => set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen })),
}));