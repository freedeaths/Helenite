import { useEffect, useCallback } from 'react';
import { useVaultStore } from '../stores/vaultStore';
import { useUIStore } from '../stores/uiStore';
import { getCurrentRoute, navigateToFile, navigateToWelcome, type ParsedRoute } from '../utils/routeUtils';

/**
 * Hash 路由管理 Hook
 * 监听 URL hash 变化并更新应用状态
 */
export function useHashRouter() {
  const { setActiveFile } = useVaultStore();
  const { setMainContentView } = useUIStore();
  
  // 处理路由变化
  const handleRouteChange = useCallback((route: ParsedRoute) => {
    if (route.type === 'welcome') {
      setActiveFile(null);
      setMainContentView('file');
    } else if (route.type === 'file' && route.filePath) {
      setActiveFile(route.filePath, route.anchor);
      setMainContentView('file');
      
      // 如果有锚点，延迟滚动到对应位置
      if (route.anchor) {
        // Increase delay to ensure content is loaded and avoid conflicts with TOC clicks
        setTimeout(() => {
          const element = document.getElementById(route.anchor!);
          if (element) {
            // Check if this is a programmatic navigation from TOC (not a hash change)
            // If element is already in view, skip the scroll to avoid conflicts
            const elementRect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const isInView = elementRect.top >= 0 && elementRect.top < viewportHeight * 0.3;
            
            if (isInView) {
              console.log('🔗 Hash router: Element already in view, skipping scroll');
              return;
            }
            
            // Find the correct scroll container (the one with actual scrollable content)
            const findScrollableContainer = () => {
              const containers = document.querySelectorAll('.flex-1.overflow-auto') as NodeListOf<HTMLElement>;
              for (const container of containers) {
                if (container.scrollHeight > container.clientHeight) {
                  return container;
                }
              }
              return null;
            };
            
            const mainContentDiv = findScrollableContainer();
            const scrollOffset = 10; // Small offset, headings have their own margin-top: 2rem (32px)
            
            if (!mainContentDiv) {
              // Fallback to window scroll - use getBoundingClientRect for accuracy
              const elementRect = element.getBoundingClientRect();
              const currentScrollY = window.scrollY || window.pageYOffset;
              const elementTop = elementRect.top + currentScrollY;
              window.scrollTo({
                top: elementTop - scrollOffset,
                behavior: 'smooth'
              });
            } else {
              // Calculate position relative to the scroll container
              const containerRect = mainContentDiv.getBoundingClientRect();
              const elementRect = element.getBoundingClientRect();
              const currentScrollTop = mainContentDiv.scrollTop;
              
              // Calculate the element's position relative to the scroll container
              const elementRelativeTop = elementRect.top - containerRect.top + currentScrollTop;
              const scrollTop = elementRelativeTop - scrollOffset;
              
              mainContentDiv.scrollTo({
                top: scrollTop,
                behavior: 'smooth'
              });
            }
          }
        }, 200); // Increased delay to avoid conflicts with TOC
      }
    }
  }, [setActiveFile, setMainContentView]);
  
  // 监听 hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      const route = getCurrentRoute();
      handleRouteChange(route);
    };
    
    // 初始化路由
    handleHashChange();
    
    // 监听 hash 变化事件
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [setActiveFile, setMainContentView, handleRouteChange]);
  
  return {
    getCurrentRoute,
    navigateToFile: (filePath: string, anchor?: string) => {
      // Import at top of file instead of dynamic require
      navigateToFile(filePath, anchor);
    },
    navigateToWelcome: () => {
      // Import at top of file instead of dynamic require
      navigateToWelcome();
    }
  };
}