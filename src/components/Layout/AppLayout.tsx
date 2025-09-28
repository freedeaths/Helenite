import { useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { LeftSidebar } from './LeftSidebar';
import { MainContent } from './MainContent';
import { RightSidebar } from './RightSidebar';
import { StatusBar } from './StatusBar';
import { ResizeHandle } from './ResizeHandle';
import { LeftRibbon } from './LeftRibbon';
import { MobileDropdownMenu } from './MobileDropdownMenu';

export function AppLayout() {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    leftSidebarWidth,
    rightSidebarWidth,
    isMobile,
    isTablet,
    setIsMobile,
    setIsTablet,
    setLeftSidebarWidth,
    setRightSidebarWidth,
    theme
  } = useUIStore();

  const leftSidebarRef = useRef<HTMLDivElement>(null);
  const rightSidebarRef = useRef<HTMLDivElement>(null);

  // Handle responsive behavior with minimal debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const newIsMobile = width < 768;
        const newIsTablet = width >= 768 && width < 1024;

        // Only update if values actually changed to prevent unnecessary re-renders
        if (newIsMobile !== isMobile) setIsMobile(newIsMobile);
        if (newIsTablet !== isTablet) {
          // When switching from tablet to desktop, keep the same sidebar width (300px)
          if (isTablet && !newIsTablet && !newIsMobile) {
            setLeftSidebarWidth(300);
          }
          setIsTablet(newIsTablet);
        }
      }, 20); // 20ms debounce - responsive but not too frequent
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [isMobile, isTablet, setIsMobile, setIsTablet, setLeftSidebarWidth]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div data-testid="app-layout" className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--background-primary)] text-[var(--text-normal)]">

      {/* Main workspace - Flex layout */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex w-full max-w-[1828px] mx-auto">
        {/* Left Ribbon - show on desktop and tablet only */}
        {!isMobile && (
          <div className="flex-shrink-0 w-12 overflow-hidden">
            <LeftRibbon />
          </div>
        )}

        {/* Left Sidebar - show on desktop and tablet when open */}
        <div
          ref={leftSidebarRef}
          data-testid="left-sidebar"
          className={`
            relative overflow-hidden sidebar-transition gpu-accelerated
            ${leftSidebarOpen && !isMobile ? 'flex-shrink-0' : 'w-0'}
          `}
          style={{
            width: leftSidebarOpen && !isMobile
              ? isTablet ? '300px' : `${leftSidebarWidth}px`
              : '0px'
          }}
        >
          {leftSidebarOpen && !isMobile && (
            <LeftSidebar />
          )}
        </div>

        {/* Left Resize handle for desktop - between left sidebar and main content */}
        {leftSidebarOpen && !isMobile && !isTablet && (
          <ResizeHandle
            direction="left"
            onResize={setLeftSidebarWidth}
            minWidth={200}
            maxWidth={360}
            sidebarRef={leftSidebarRef}
          />
        )}

        {/* Main Content */}
        <div data-testid="main-content" className={`relative overflow-hidden ${isMobile ? 'flex-1 min-w-0' : 'flex-1'}`}>
          <MainContent />
        </div>

        {/* Right Resize handle for desktop - between main content and right sidebar */}
        {rightSidebarOpen && !isMobile && !isTablet && (
          <ResizeHandle
            direction="right"
            onResize={setRightSidebarWidth}
            minWidth={200}
            maxWidth={360}
            sidebarRef={rightSidebarRef}
          />
        )}

        {/* Right Sidebar - only show on desktop (not tablet or mobile) */}
        <div
          ref={rightSidebarRef}
          data-testid="right-sidebar"
          className={`
            relative overflow-hidden sidebar-transition gpu-accelerated hide-tablet hide-mobile
            ${rightSidebarOpen && !isMobile && !isTablet ? 'flex-shrink-0' : 'w-0'}
          `}
          style={{
            width: rightSidebarOpen && !isMobile && !isTablet
              ? `${rightSidebarWidth}px`
              : '0px'
          }}
        >
          {rightSidebarOpen && !isMobile && !isTablet && (
            <RightSidebar />
          )}
        </div>
        </div>
      </div>

      {/* Status Bar - Desktop and Tablet only */}
      {/* 移动端模拟正常显示，真机不显示 */}
      {!isMobile && <StatusBar />}

      {/* Mobile Navigation - 使用老版本风格的下拉菜单 */}
      {isMobile && <MobileDropdownMenu />}

    </div>
  );
}