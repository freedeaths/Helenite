import { useEffect, useCallback } from 'react';
import { useVaultStore } from '../stores/vaultStore';
import { useUIStore } from '../stores/uiStore';
import {
  getCurrentRoute,
  navigateToFile,
  navigateToWelcome,
  navigateToGlobalGraph,
  type ParsedRoute,
} from './routeUtils';

/**
 * 新架构路由管理 Hook
 * 完全复制原版路由逻辑，适配新的 store 系统
 */
export function useHashRouter() {
  const { setActiveFile } = useVaultStore();
  const { setMainContentView } = useUIStore();

  // 处理路由变化 - 完全复制原版逻辑
  const handleRouteChange = useCallback(
    (route: ParsedRoute) => {
      // console.log('📍 New Route change:', route);
      if (route.type === 'welcome') {
        setActiveFile(null);
        setMainContentView('file');
      } else if (route.type === 'global-graph') {
        setMainContentView('globalGraph');
      } else if (route.type === 'file' && route.filePath) {
        // console.log('📍 New Setting activeFile to:', route.filePath);
        setActiveFile(route.filePath);
        setMainContentView('file');

        // 如果有锚点，延迟滚动到对应位置 - 复制原版滚动逻辑
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
                // console.log('🔗 New Hash router: Element already in view, skipping scroll');
                return;
              }

              // Find the correct scroll container (the one with actual scrollable content)
              const findScrollableContainer = () => {
                const containers = document.querySelectorAll(
                  '.flex-1.overflow-auto'
                ) as NodeListOf<HTMLElement>;
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
                  behavior: 'smooth',
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
                  behavior: 'smooth',
                });
              }
            }
          }, 200); // Increased delay to avoid conflicts with TOC
        }
      }
    },
    [setActiveFile, setMainContentView]
  );

  // 监听 hash 变化 - 完全复制原版逻辑
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
  }, [handleRouteChange]);

  // 监听内部链接点击的自定义事件
  useEffect(() => {
    const handleNavigateToFile = (event: Event) => {
      const customEvent = event as CustomEvent;
      const filePath = customEvent.detail?.filePath;
      if (filePath) {
        navigateToFile(filePath);
      }
    };

    window.addEventListener('navigateToFile', handleNavigateToFile);

    return () => {
      window.removeEventListener('navigateToFile', handleNavigateToFile);
    };
  }, []);

  return {
    getCurrentRoute,
    navigateToFile: (filePath: string, anchor?: string) => {
      navigateToFile(filePath, anchor);
    },
    navigateToWelcome: () => {
      navigateToWelcome();
    },
    navigateToGlobalGraph: () => {
      navigateToGlobalGraph();
    },
  };
}
