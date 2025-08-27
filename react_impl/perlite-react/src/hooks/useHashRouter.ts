import { useEffect } from 'react';
import { useVaultStore } from '../stores/vaultStore';
import { useUIStore } from '../stores/uiStore';
import { parseHashRoute, getCurrentRoute, type ParsedRoute } from '../utils/routeUtils';

/**
 * Hash 路由管理 Hook
 * 监听 URL hash 变化并更新应用状态
 */
export function useHashRouter() {
  const { setActiveFile } = useVaultStore();
  const { setMainContentView } = useUIStore();
  
  // 处理路由变化
  const handleRouteChange = (route: ParsedRoute) => {
    if (route.type === 'welcome') {
      setActiveFile(null);
      setMainContentView('file');
    } else if (route.type === 'file' && route.filePath) {
      setActiveFile(route.filePath, route.anchor);
      setMainContentView('file');
      
      // 如果有锚点，延迟滚动到对应位置
      if (route.anchor) {
        setTimeout(() => {
          const element = document.getElementById(route.anchor!);
          if (element) {
            const headerHeight = 40;
            const elementTop = element.offsetTop;
            window.scrollTo({
              top: elementTop - headerHeight,
              behavior: 'smooth'
            });
          }
        }, 100); // 等待内容加载
      }
    }
  };
  
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
  }, [setActiveFile, setMainContentView]);
  
  return {
    getCurrentRoute,
    navigateToFile: (filePath: string, anchor?: string) => {
      const { navigateToFile } = require('../utils/routeUtils');
      navigateToFile(filePath, anchor);
    },
    navigateToWelcome: () => {
      const { navigateToWelcome } = require('../utils/routeUtils');
      navigateToWelcome();
    }
  };
}