import { useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { LeftSidebar } from './LeftSidebar';
import { MainContent } from './MainContent';
import { RightSidebar } from './RightSidebar';
import { StatusBar } from './StatusBar';
import { ResizeHandle } from './ResizeHandle';
import { MobileDrawer } from './MobileDrawer';
import { MobileNavBar } from './MobileNavBar';
import { LeftRibbon } from './LeftRibbon';

export function AppLayout() {
  const { 
    leftSidebarOpen, 
    rightSidebarOpen, 
    leftSidebarWidth, 
    rightSidebarWidth, 
    isMobile, 
    isTablet,
    mobileLeftDrawerOpen,
    mobileRightDrawerOpen,
    activeLeftPanel,
    activeRightPanel,
    setIsMobile,
    setIsTablet,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    setMobileLeftDrawerOpen,
    setMobileRightDrawerOpen,
    theme
  } = useUIStore();

  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile, setIsTablet]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const getGridTemplate = () => {
    // Mobile: 0px + flex + 0px (no sidebars, no ribbon)
    if (isMobile) {
      return '0px 1fr 0px';
    }
    
    // Tablet: 48px + 300px + flex + 0px (ribbon + left sidebar only, narrower)
    if (isTablet) {
      const leftWidth = leftSidebarOpen ? '300px' : '0px';
      return `48px ${leftWidth} 1fr 0px`;
    }
    
    // Desktop: 48px + sidebar + flex + sidebar (ribbon + both sidebars)
    const leftWidth = leftSidebarOpen ? `${leftSidebarWidth}px` : '0px';
    const rightWidth = rightSidebarOpen ? `${rightSidebarWidth}px` : '0px';
    
    return `48px ${leftWidth} 1fr ${rightWidth}`;
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--background-primary)] text-[var(--text-normal)]">
      {/* Title bar - only show on desktop */}
      {!isMobile && (
        <div className="h-8 bg-[var(--background-secondary)] border-b border-[var(--background-modifier-border)] flex items-center px-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <div className="flex-1 text-center text-sm font-medium">
            Perlite
          </div>
        </div>
      )}
      
      {/* Mobile navigation bar */}
      {isMobile && <MobileNavBar />}

      {/* Main workspace */}
      <div className="flex-1 overflow-hidden">
        <div 
          className="h-full grid transition-all duration-300 ease-in-out"
          style={{ gridTemplateColumns: getGridTemplate() }}
        >
          {/* Left Ribbon - show on desktop and tablet only */}
          {!isMobile && (
            <div className="overflow-hidden">
              <LeftRibbon />
            </div>
          )}
          
          {/* Left Sidebar - show on desktop and tablet when open */}
          {leftSidebarOpen && !isMobile && (
            <div 
              ref={leftSidebarRef}
              className="relative border-r border-[var(--background-modifier-border)] overflow-hidden"
            >
              <LeftSidebar />
            </div>
          )}

          {/* Main Content */}
          <div className="relative overflow-hidden">
            <MainContent />
            {/* Left Resize handle for desktop - positioned between left sidebar and main content */}
            {leftSidebarOpen && !isMobile && !isTablet && (
              <ResizeHandle
                direction="left"
                onResize={setLeftSidebarWidth}
                currentWidth={leftSidebarWidth}
                minWidth={200}
                maxWidth={600}
                sidebarRef={leftSidebarRef}
              />
            )}
          </div>

          {/* Right Sidebar - only show on desktop (not tablet or mobile) */}
          {rightSidebarOpen && !isMobile && !isTablet && (
            <div 
              ref={rightSidebarRef}
              className="relative border-l border-[var(--background-modifier-border)] overflow-hidden"
            >
              <RightSidebar />
              {/* Resize handle for desktop */}
              <ResizeHandle
                direction="right"
                onResize={setRightSidebarWidth}
                currentWidth={rightSidebarWidth}
                minWidth={200}
                maxWidth={600}
                sidebarRef={rightSidebarRef}
              />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
      
      {/* Mobile Drawers */}
      {isMobile && (
        <>
          <MobileDrawer
            isOpen={mobileLeftDrawerOpen}
            onClose={() => setMobileLeftDrawerOpen(false)}
            side="left"
            title={activeLeftPanel === 'files' ? 'Files' : 'Search'}
          >
            <LeftSidebar />
          </MobileDrawer>
          
          <MobileDrawer
            isOpen={mobileRightDrawerOpen}
            onClose={() => setMobileRightDrawerOpen(false)}
            side="right"
            title={
              activeRightPanel === 'outline' ? 'Outline' : 
              activeRightPanel === 'graph' ? 'Graph' : 'Tags'
            }
          >
            <RightSidebar />
          </MobileDrawer>
        </>
      )}
    </div>
  );
}