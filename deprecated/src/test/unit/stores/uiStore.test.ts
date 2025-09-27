import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../../stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      leftSidebarWidth: 300,
      rightSidebarWidth: 280,
      activeLeftPanel: 'files',
      activeRightPanel: 'outline',
      mainContentView: 'file',
      theme: 'light',
      isMobile: false,
      isTablet: false,
      mobileLeftDrawerOpen: false,
      mobileRightDrawerOpen: false,
      mobileDrawerOpen: false,
      activeMobileTab: 'files',
      mobileDropdownOpen: false,
    });
  });

  describe('initial state', () => {
    it('should have correct default values', () => {
      const state = useUIStore.getState();
      
      expect(state.activeLeftPanel).toBe('files');
      expect(state.activeRightPanel).toBe('outline');
      expect(state.mainContentView).toBe('file');
      expect(state.theme).toBe('light');
      expect(state.leftSidebarWidth).toBe(300);
      expect(state.rightSidebarWidth).toBe(280);
    });
  });

  describe('sidebar actions', () => {
    it('should toggle left sidebar', () => {
      const { toggleLeftSidebar } = useUIStore.getState();
      
      expect(useUIStore.getState().leftSidebarOpen).toBe(true);
      toggleLeftSidebar();
      expect(useUIStore.getState().leftSidebarOpen).toBe(false);
      toggleLeftSidebar();
      expect(useUIStore.getState().leftSidebarOpen).toBe(true);
    });

    it('should toggle right sidebar', () => {
      const { toggleRightSidebar } = useUIStore.getState();
      
      expect(useUIStore.getState().rightSidebarOpen).toBe(true);
      toggleRightSidebar();
      expect(useUIStore.getState().rightSidebarOpen).toBe(false);
    });

    it('should constrain sidebar width', () => {
      const { setLeftSidebarWidth } = useUIStore.getState();
      
      // Test minimum constraint
      setLeftSidebarWidth(100);
      expect(useUIStore.getState().leftSidebarWidth).toBe(200);
      
      // Test maximum constraint  
      setLeftSidebarWidth(700);
      expect(useUIStore.getState().leftSidebarWidth).toBe(600);
      
      // Test valid value
      setLeftSidebarWidth(400);
      expect(useUIStore.getState().leftSidebarWidth).toBe(400);
    });
  });

  describe('panel switching', () => {
    it('should switch active left panel', () => {
      const { setActiveLeftPanel } = useUIStore.getState();
      
      setActiveLeftPanel('tags');
      expect(useUIStore.getState().activeLeftPanel).toBe('tags');
      
      setActiveLeftPanel('files');
      expect(useUIStore.getState().activeLeftPanel).toBe('files');
    });

    it('should switch active right panel', () => {
      const { setActiveRightPanel } = useUIStore.getState();
      
      setActiveRightPanel('graph');
      expect(useUIStore.getState().activeRightPanel).toBe('graph');
      
      setActiveRightPanel('outline');
      expect(useUIStore.getState().activeRightPanel).toBe('outline');
    });
  });

  describe('theme management', () => {
    it('should switch theme', () => {
      const { setTheme } = useUIStore.getState();
      
      setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
      
      setTheme('light');  
      expect(useUIStore.getState().theme).toBe('light');
    });
  });

  describe('responsive behavior', () => {
    it('should handle mobile state changes', () => {
      const { setIsMobile } = useUIStore.getState();
      
      // Switch to mobile should close drawers
      useUIStore.setState({ 
        mobileLeftDrawerOpen: true,
        mobileRightDrawerOpen: true 
      });
      
      setIsMobile(true);
      const state = useUIStore.getState();
      
      expect(state.isMobile).toBe(true);
      expect(state.mobileLeftDrawerOpen).toBe(false);
      expect(state.mobileRightDrawerOpen).toBe(false);
    });

    it('should handle tablet state changes', () => {
      const { setIsTablet } = useUIStore.getState();
      
      // Set a wide sidebar width first
      useUIStore.setState({ leftSidebarWidth: 500 });
      
      setIsTablet(true);
      const state = useUIStore.getState();
      
      expect(state.isTablet).toBe(true);
      expect(state.leftSidebarWidth).toBe(300); // Should be adjusted to tablet width
    });
  });

  describe('mobile drawer management', () => {
    it('should manage unified mobile drawer', () => {
      const { setMobileDrawerOpen, setActiveMobileTab } = useUIStore.getState();
      
      setMobileDrawerOpen(true);
      expect(useUIStore.getState().mobileDrawerOpen).toBe(true);
      
      setActiveMobileTab('outline');
      expect(useUIStore.getState().activeMobileTab).toBe('outline');
      
      setMobileDrawerOpen(false);
      expect(useUIStore.getState().mobileDrawerOpen).toBe(false);
    });
  });
});