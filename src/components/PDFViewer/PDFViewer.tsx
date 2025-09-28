import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 设置 PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  style?: string;
}

// 检测是否是移动设备（包括平板）
const isMobileOrTablet = () => {
  // 检查用户代理
  const userAgent = navigator.userAgent;
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  // 检查触屏能力
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // 平板通常宽度在 768-1024px，但如果是触屏设备，应该使用移动端渲染
  return isMobileUA || (isTouchDevice && window.innerWidth < 1024);
};

export const PDFViewer: React.FC<PDFViewerProps> = ({ url, style }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [isDesktop, setIsDesktop] = useState(!isMobileOrTablet());
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const pdfContainerRef = React.useRef<HTMLDivElement>(null);

  // 添加强化的 CSS 样式控制
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* 确保PDF容器本身没有异常的内外边距或定位 */
      .pdf-container {
        box-sizing: border-box;
      }

      /* 强制 Document 容器不限制高度 */
      .pdf-document {
        height: auto !important;
        display: block !important;
      }

      /* 针对react-pdf内部元素的关键样式 */
      .react-pdf__Page {
        display: block !important;
        margin: 0 auto !important;
        max-width: 100%;
        height: auto !important;
        position: relative !important;
      }

      .react-pdf__Page__canvas {
        max-width: 100% !important;
        height: auto !important;
        display: block !important;
        margin: 0 auto;
      }

      /* 确保 PDF 页面容器不限制高度 */
      .react-pdf__Page__svg {
        max-width: 100% !important;
        height: auto !important;
      }

      /* 确保文本层不影响布局 */
      .react-pdf__Page__textContent {
        height: 100% !important;
      }

      /* 解决可能存在的隐藏Canvas布局占用问题 */
      .hiddenCanvasElement {
        position: absolute !important;
      }

      /* 移动端横屏特殊处理 */
      @media screen and (max-width: 1024px) and (orientation: landscape) {
        .react-pdf__Page {
          max-height: none !important;
        }
        .react-pdf__Page__canvas {
          max-height: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);


  useEffect(() => {
    const handleResize = () => {
      const wasLandscape = isLandscape;
      const nowLandscape = window.innerWidth > window.innerHeight;

      setIsDesktop(!isMobileOrTablet());
      setIsLandscape(nowLandscape);

      // 横屏模式下自动调整缩放比例
      if (isMobileOrTablet() && nowLandscape && !wasLandscape) {
        setScale(1.5); // 横屏时默认放大到1.5倍
      } else if (isMobileOrTablet() && !nowLandscape && wasLandscape) {
        setScale(1); // 竖屏时恢复到1倍
      }

      // 使用 requestAnimationFrame 确保在浏览器重绘后获取尺寸
      requestAnimationFrame(() => {
        if (pdfContainerRef.current) {
          const width = pdfContainerRef.current.clientWidth;
          setContainerWidth(width);
        } else {
          // 使用 Visual Viewport API 获取真实宽度
          const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
          setContainerWidth(vw);
        }
      });
    };

    // 初始化时调用
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [isLandscape]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  // 全屏功能
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 桌面端：使用 iframe 以获得更好的体验
  if (isDesktop) {
    return (
      <iframe
        src={url}
        style={{
          width: '100%',
          height: '800px',
          border: '1px solid var(--background-modifier-border)',
          borderRadius: '4px'
        }}
        title="PDF Viewer"
        loading="lazy"
      />
    );
  }

  // 添加 Visual Viewport API 支持来修复横屏高度问题
  useEffect(() => {
    const updateHeight = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
      setViewportHeight(vh);


      if (containerRef.current) {
        containerRef.current.style.height = isFullscreen ? `${vh}px` : 'auto';
      }
      // 同时更新 PDF 容器的高度
      if (pdfContainerRef.current && isFullscreen) {
        // 减去工具栏高度（约 60px）
        pdfContainerRef.current.style.maxHeight = `${vh - 60}px`;
      }
    };

    updateHeight();
    window.visualViewport?.addEventListener('resize', updateHeight);
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateHeight);
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
    };
  }, [isFullscreen]);

  // 移动端：使用 react-pdf
  return (
    <div ref={containerRef} className="pdf-container" style={{
      width: '100%',
      position: 'relative',
      background: isFullscreen ? 'var(--background-primary)' : 'transparent',
      // 高度通过 useEffect 动态设置，避免使用 100vh
      height: 'auto',
      // 确保 react-pdf 的样式不被覆盖
      display: 'block'
    }}>
      <Document
        file={url}
        onLoadSuccess={onDocumentLoadSuccess}
        className="pdf-document"
        loading={
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '2rem',
            minHeight: '400px',
            alignItems: 'center'
          }}>
            <div>正在加载 PDF...</div>
          </div>
        }
        error={
          <div style={{
            border: '1px solid var(--background-modifier-border)',
            borderRadius: '4px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <p>无法加载 PDF 文件</p>
            <p style={{ fontSize: '0.9em', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              {url.split('/').pop()}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--text-accent)',
                display: 'inline-block',
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                border: '1px solid var(--text-accent)',
                borderRadius: '4px',
                textDecoration: 'none'
              }}
            >
              在新窗口中打开
            </a>
          </div>
        }
      >
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--background-primary)',
          borderBottom: '1px solid var(--background-modifier-border)',
          padding: '0.5rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          zIndex: 10
        }}>
          <button
            onClick={() => setScale(scale - 0.2)}
            disabled={scale <= 0.5}
            style={{
              padding: '0.25rem 0.75rem',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '4px',
              background: 'var(--background-primary)',
              color: 'var(--text-normal)',
              cursor: scale <= 0.5 ? 'not-allowed' : 'pointer',
              opacity: scale <= 0.5 ? 0.5 : 1
            }}
          >
            缩小
          </button>
          <span style={{ fontSize: '0.9em' }}>{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(scale + 0.2)}
            disabled={scale >= 2}
            style={{
              padding: '0.25rem 0.75rem',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '4px',
              background: 'var(--background-primary)',
              color: 'var(--text-normal)',
              cursor: scale >= 2 ? 'not-allowed' : 'pointer',
              opacity: scale >= 2 ? 0.5 : 1
            }}
          >
            放大
          </button>
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '0.25rem 0.75rem',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '4px',
              background: 'var(--background-primary)',
              color: 'var(--text-normal)',
              cursor: 'pointer',
              marginLeft: 'auto'
            }}
          >
            {isFullscreen ? '退出全屏' : '全屏'}
          </button>
        </div>

        <div ref={pdfContainerRef} style={{
          padding: '1rem',
          width: '100%',
          // 全屏模式下需要限制高度，否则让内容自然流动
          // maxHeight 通过 useEffect 动态设置，避免使用固定的 vh
          ...(isFullscreen && {
            overflow: 'auto'
          })
        }}>
          {Array.from(new Array(numPages || 0), (el, index) => {
            // 移动端横屏时，使用 scale 而不是固定 width/height
            if (!isDesktop && isLandscape) {
              // 横屏模式：让 react-pdf 自动适应，只提供缩放比例
              return (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mb-4"
                  style={{
                    margin: '0 auto',
                    display: 'block'
                  }}
                />
              );
            } else {
              // 竖屏模式或桌面端：使用宽度适配
              const pageWidth = (containerWidth - 40) * scale;
              return (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  width={pageWidth}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="mb-4"
                  style={{ height: 'auto' }}
                />
              );
            }
          })}
        </div>
      </Document>
    </div>
  );
};