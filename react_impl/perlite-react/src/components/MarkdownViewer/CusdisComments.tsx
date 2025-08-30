import { useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/uiStore';
import './CusdisComments.css';

interface CusdisCommentsProps {
  pageId: string;     // 使用 UUID 作为稳定的页面标识符
  pageTitle: string;
  pageUrl: string;
}

export function CusdisComments({ pageId, pageTitle, pageUrl }: CusdisCommentsProps) {
  const cusdisRef = useRef<HTMLDivElement>(null);
  const { theme } = useUIStore();
  
  // 从环境变量获取配置
  const appId = import.meta.env.VITE_CUSDIS_APP_ID;
  const cusdisHost = import.meta.env.VITE_CUSDIS_HOST || 'https://cusdis.com';

  useEffect(() => {
    if (!cusdisRef.current || !pageId || !appId) return;

    // 清空之前的内容
    cusdisRef.current.innerHTML = '';

    // 创建 Cusdis 容器元素
    const cusdisElement = document.createElement('div');
    cusdisElement.id = 'cusdis_thread';
    cusdisElement.setAttribute('data-host', cusdisHost);
    cusdisElement.setAttribute('data-app-id', appId);
    cusdisElement.setAttribute('data-page-id', pageId);
    cusdisElement.setAttribute('data-page-url', pageUrl);
    cusdisElement.setAttribute('data-page-title', pageTitle);
    
    // 主题适配
    cusdisElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    
    // 移除 data-lang 属性，改用单独的语言脚本加载
    
    // 基本样式设置
    cusdisElement.style.width = '100%';
    cusdisElement.style.border = 'none';
    
    cusdisRef.current.appendChild(cusdisElement);

    // 添加全局 CSS 来强制 iframe 高度
    const addIframeStyles = () => {
      const styleId = 'cusdis-iframe-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          #cusdis_thread iframe {
            min-height: 500px !important;
            height: auto !important;
          }
          
          /* 强制覆盖 Cusdis 的内联样式 */
          iframe[src*="cusdis"] {
            min-height: 500px !important;
            height: auto !important;
          }
          
          /* 暗主题优化 */
          [data-theme="dark"] #cusdis_thread {
            background: var(--background-primary) !important;
          }
        `;
        document.head.appendChild(style);
      }
    };

    // 先加载中文语言包，再加载主脚本
    const loadScriptsSequentially = () => {
      // 检查语言脚本是否已存在
      const existingLangScript = document.querySelector('script[src="https://cusdis.com/js/widget/lang/zh-cn.js"]');
      if (!existingLangScript) {
        const langScript = document.createElement('script');
        langScript.src = 'https://cusdis.com/js/widget/lang/zh-cn.js';
        langScript.defer = true;
        document.head.appendChild(langScript);
      }
      
      // 检查主脚本是否已存在
      const existingMainScript = document.querySelector('script[src="https://cusdis.com/js/cusdis.es.js"]');
      if (!existingMainScript) {
        const mainScript = document.createElement('script');
        mainScript.src = 'https://cusdis.com/js/cusdis.es.js';
        mainScript.defer = true;
        mainScript.onload = () => {
          // 主脚本加载完成后初始化
          if (window.CUSDIS) {
            addIframeStyles();
            window.CUSDIS.renderTo(cusdisElement);
            
            // 使用多次重试来确保样式生效
            const retryStyleApplication = (attempts = 0) => {
              const iframe = cusdisElement.querySelector('iframe');
              if (iframe && attempts < 10) {
                iframe.style.cssText += 'min-height: 500px !important; height: auto !important;';
                setTimeout(() => retryStyleApplication(attempts + 1), 200);
              }
            };
            
            setTimeout(() => retryStyleApplication(), 100);
          }
        };
        document.head.appendChild(mainScript);
      } else if (window.CUSDIS) {
        // 主脚本已存在且已加载，直接渲染
        addIframeStyles();
        window.CUSDIS.renderTo(cusdisElement);
        
        const retryStyleApplication = (attempts = 0) => {
          const iframe = cusdisElement.querySelector('iframe');
          if (iframe && attempts < 10) {
            iframe.style.cssText += 'min-height: 500px !important; height: auto !important;';
            setTimeout(() => retryStyleApplication(attempts + 1), 200);
          }
        };
        
        setTimeout(() => retryStyleApplication(), 100);
      }
    };
    
    loadScriptsSequentially();

    // 清理函数 - 不移除脚本，因为可能被其他实例使用
    return () => {
      // 只清空容器内容即可
    };
  }, [pageId, pageTitle, pageUrl, appId, cusdisHost, theme]);

  if (!pageId || !appId) {
    return null; // 没有 UUID 或 App ID 就不显示评论
  }

  return (
    <div className="cusdis-comments mt-8 pt-8 border-t border-[var(--background-modifier-border)]">
      <h3 className="text-lg font-semibold mb-6 text-[var(--text-normal)]">评论</h3>
      <div 
        ref={cusdisRef} 
        className="cusdis-container"
        style={{
          backgroundColor: 'var(--background-primary)',
          minHeight: '500px'
        }}
      />
    </div>
  );
}

// 扩展 Window 类型以包含 CUSDIS
declare global {
  interface Window {
    CUSDIS?: {
      renderTo: (element: HTMLElement) => void;
    };
  }
}