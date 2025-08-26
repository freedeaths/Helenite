import { create } from 'zustand';

interface UIState {
  // Sidebar states
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  
  // Active panels
  activeLeftPanel: 'files' | 'search';
  activeRightPanel: 'outline' | 'graph' | 'tags';
  
  // Theme
  theme: 'light' | 'dark';
  
  // Responsive states
  isMobile: boolean;
  isTablet: boolean;
  
  // Mobile drawer states
  mobileLeftDrawerOpen: boolean;
  mobileRightDrawerOpen: boolean;
  
  // New unified mobile drawer
  mobileDrawerOpen: boolean;
  activeMobileTab: 'files' | 'search' | 'outline' | 'graph' | 'tags';
  
  // Mobile dropdown menu from ViewHeader
  mobileDropdownOpen: boolean;
  
  // Actions
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setLeftSidebarWidth: (width: number) => void;
  setRightSidebarWidth: (width: number) => void;
  setActiveLeftPanel: (panel: 'files' | 'search') => void;
  setActiveRightPanel: (panel: 'outline' | 'graph' | 'tags') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setIsMobile: (isMobile: boolean) => void;
  setIsTablet: (isTablet: boolean) => void;
  
  // Mobile drawer actions
  setMobileLeftDrawerOpen: (open: boolean) => void;
  setMobileRightDrawerOpen: (open: boolean) => void;
  
  // New unified mobile drawer actions
  setMobileDrawerOpen: (open: boolean) => void;
  setActiveMobileTab: (tab: 'files' | 'search' | 'outline' | 'graph' | 'tags') => void;
  
  // Mobile dropdown actions
  setMobileDropdownOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Initial state
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  leftSidebarWidth: 300,    // 统一使用 300px，与平板模式保持一致
  rightSidebarWidth: 280,   // 减少到 280px，足够放置 TOC 和图谱
  activeLeftPanel: 'files',
  activeRightPanel: 'outline',
  theme: 'light',
  isMobile: false,
  isTablet: false,
  
  // Mobile drawer states
  mobileLeftDrawerOpen: false,
  mobileRightDrawerOpen: false,
  
  // New unified mobile drawer
  mobileDrawerOpen: false,
  activeMobileTab: 'files',
  
  // Mobile dropdown menu
  mobileDropdownOpen: false,
  
  // Actions
  toggleLeftSidebar: () => set((state) => ({ 
    leftSidebarOpen: !state.leftSidebarOpen 
  })),
  toggleRightSidebar: () => set((state) => ({ 
    rightSidebarOpen: !state.rightSidebarOpen 
  })),
  setLeftSidebarWidth: (width) => {
    // Constrain width between 200px and 600px for desktop dragging
    const constrainedWidth = Math.max(200, Math.min(600, width));
    set({ leftSidebarWidth: constrainedWidth });
  },
  setRightSidebarWidth: (width) => {
    // Constrain width between 200px and 600px for desktop dragging
    const constrainedWidth = Math.max(200, Math.min(600, width));
    set({ rightSidebarWidth: constrainedWidth });
  },
  setActiveLeftPanel: (panel) => set({ activeLeftPanel: panel }),
  setActiveRightPanel: (panel) => set({ activeRightPanel: panel }),
  setTheme: (theme) => set({ theme }),
  setIsMobile: (isMobile) => set((state) => {
    // 当切换到移动端时，关闭抽屉
    if (isMobile && !state.isMobile) {
      return { 
        isMobile, 
        mobileLeftDrawerOpen: false,
        mobileRightDrawerOpen: false
      };
    }
    return { isMobile };
  }),
  setIsTablet: (isTablet) => set((state) => {
    // 切换到平板模式时，确保左侧栏宽度合理
    if (isTablet && !state.isTablet && state.leftSidebarWidth > 300) {
      return { 
        isTablet,
        // 如果当前宽度太大，调整为平板模式的300px
        leftSidebarWidth: 300
      };
    }
    return { isTablet };
  }),
  
  // Mobile drawer actions
  setMobileLeftDrawerOpen: (open) => set({ mobileLeftDrawerOpen: open }),
  setMobileRightDrawerOpen: (open) => set({ mobileRightDrawerOpen: open }),
  
  // New unified mobile drawer actions
  setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
  setActiveMobileTab: (tab) => set({ activeMobileTab: tab }),
  
  // Mobile dropdown actions
  setMobileDropdownOpen: (open) => set({ mobileDropdownOpen: open }),
}));