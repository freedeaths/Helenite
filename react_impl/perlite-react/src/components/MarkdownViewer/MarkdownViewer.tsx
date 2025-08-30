import { useEffect, useState, useRef } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { useUIStore } from '../../stores/uiStore';
import { markdownProcessor } from '../../services/markdownProcessor';
import { MetaTagService } from '../../services/metaTagService';
import { useFileAPI } from '../../hooks/useAPIs';
import { useTags } from '../../apis/hooks/useTagAPI';
import { MermaidDiagram } from './MermaidDiagram';
import { TrackMap } from './TrackMap';
import { CusdisComments } from './CusdisComments';

import 'katex/dist/katex.min.css';
import './MarkdownViewer.css';

export function MarkdownViewer() {
  const { activeFile, setCurrentDocumentMetadata } = useVaultStore();
  const { theme } = useUIStore();
  const fileAPI = useFileAPI();
  const { getFileTags } = useTags();
  const [content, setContent] = useState<string>('');
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileTags, setFileTags] = useState<string[]>([]);
  const [frontMatter, setFrontMatter] = useState<any>(null);
  const [mermaidDiagrams, setMermaidDiagrams] = useState<Array<{ id: string; code: string; placeholder: string }>>([]);
  const [trackMaps, setTrackMaps] = useState<Array<{ id: string; code: string; placeholder: string; isFile?: boolean }>>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const [imageZoom, setImageZoom] = useState<{ src: string; alt: string } | null>(null);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);

  // Dynamic highlight.js theme loading
  useEffect(() => {
    // Remove existing highlight.js theme
    const existingTheme = document.getElementById('highlight-theme');
    if (existingTheme) {
      existingTheme.remove();
    }

    // Load appropriate theme based on current theme
    const themeUrl = theme === 'dark' 
      ? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
      : 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';

    const link = document.createElement('link');
    link.id = 'highlight-theme';
    link.rel = 'stylesheet';
    link.href = themeUrl;
    document.head.appendChild(link);
  }, [theme]);

  useEffect(() => {
    if (activeFile) {
      setError(null);
      setLoading(true);
      
      // Decode URL-encoded file path before loading
      const decodedPath = decodeURIComponent(activeFile);
      console.log('Loading file:', { original: activeFile, decoded: decodedPath });
      
      // Load real file content using FileAPI
      fileAPI.getFileContent(decodedPath)
        .then((realContent) => {
          setContent(realContent);
          console.log(`📄 Loaded real content for ${activeFile}: ${realContent.length} chars`);
          
          // 更新页面meta标签用于分享
          const fileName = decodedPath.split('/').pop() || 'Untitled';
          const metaData = MetaTagService.generateMetaFromContent(fileName, realContent);
          MetaTagService.updateMetaTags(metaData);
          console.log('Updated page meta tags:', metaData);
          
          // Process markdown content with our comprehensive processor
          // Simplified version without file index dependency
          return markdownProcessor.processWithMetadata(
            realContent,
            decodedPath // current file path for relative link resolution
          );
        })
        .then(async (result) => {
          setRenderedContent(result.html);
          setCurrentDocumentMetadata(result.metadata); // Store in global state for TOC
          setMermaidDiagrams(result.mermaidDiagrams);
          setTrackMaps(result.trackMaps);
          setFrontMatter(result.frontMatter); // Store front matter for Cusdis
          
          console.log('Processed markdown metadata:', result.metadata);
          console.log('📄 Front Matter 数据:', {
            filePath: activeFile,
            frontMatter: result.frontMatter,
            uuid: result.frontMatter.uuid,
            tags: result.frontMatter.tags,
            customFields: Object.keys(result.frontMatter).filter(key => !['tags'].includes(key))
          });
          
          console.log('Found Mermaid diagrams:', result.mermaidDiagrams);
          console.log('Found track maps:', result.trackMaps);
          
          // Load file tags using LocalTagAPI
          const tags = await getFileTags(decodedPath);
          setFileTags(tags);
          console.log('📋 Loaded tags from LocalTagAPI:', tags);
        })
        .catch((err) => {
          console.error('File loading or markdown processing error:', err);
          setError(`无法加载文件: ${activeFile}`);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setContent('');
      setRenderedContent('');
      setError(null);
      setCurrentDocumentMetadata(null); // Clear metadata when no file
      setMermaidDiagrams([]);
      setTrackMaps([]);
      setFileTags([]);
      setFrontMatter(null);
      setImageZoom(null); // Clear image zoom when no file
      
      // 重置meta标签为默认值
      MetaTagService.resetToDefaults();
    }
  }, [activeFile, fileAPI, setCurrentDocumentMetadata, getFileTags]);

  // Add image click handlers using event delegation with mobile-specific retry mechanism
  const hasRenderedContent = Boolean(renderedContent);
  useEffect(() => {
    if (!hasRenderedContent) {
      console.log('Waiting for content to be rendered:', { hasRenderedContent });
      return;
    }

    const handleClick = (event: Event) => {
      console.log('Click detected on:', event.target);
      const target = event.target as HTMLElement;
      if (target.tagName === 'IMG') {
        console.log('Image click detected:', target);
        const img = target as HTMLImageElement;
        event.preventDefault();
        console.log('Setting image zoom:', { src: img.src, alt: img.alt });
        setImageZoom({
          src: img.src,
          alt: img.alt || ''
        });
      }
    };

    // Mobile-specific ref attachment strategy with retry mechanism
    const attachEventListener = (retryCount = 0) => {
      const maxRetries = 5;
      const retryDelay = [0, 50, 100, 200, 500][retryCount] || 500;

      // Try multiple ways to get the container element
      let container = contentRef.current;
      
      // Fallback 1: Direct DOM query if ref is null
      if (!container) {
        container = document.querySelector('.markdown-viewer') as HTMLDivElement;
        console.log('Fallback: Using DOM querySelector for .markdown-viewer:', !!container);
      }

      // Fallback 2: Query by checking if images exist
      if (!container) {
        const images = document.querySelectorAll('.markdown-viewer img');
        if (images.length > 0) {
          container = images[0].closest('.markdown-viewer') as HTMLDivElement;
          console.log('Fallback: Found container via image parent:', !!container);
        }
      }

      if (container) {
        console.log(`✅ Successfully attached event listener on retry ${retryCount}, container:`, container);
        container.addEventListener('click', handleClick);
        
        // Return cleanup function
        return () => {
          console.log('Removing click listener from container');
          container.removeEventListener('click', handleClick);
        };
      } else if (retryCount < maxRetries) {
        console.log(`⏳ Retry ${retryCount + 1}/${maxRetries} in ${retryDelay}ms - container not found`);
        
        // Schedule retry with exponential backoff
        const timeoutId = setTimeout(() => {
          attachEventListener(retryCount + 1);
        }, retryDelay);
        
        return () => {
          clearTimeout(timeoutId);
        };
      } else {
        console.error('❌ Failed to attach event listener after', maxRetries, 'retries');
        return () => {}; // No-op cleanup
      }
    };

    // Initial attempt to attach event listener
    const cleanup = attachEventListener(0);
    return cleanup;
  }, [activeFile, hasRenderedContent]); // Use stable boolean dependency

  // Reset image zoom states when modal opens/closes
  useEffect(() => {
    if (imageZoom) {
      setImageScale(1);
      setImagePosition({ x: 0, y: 0 });
      setIsDragging(false);
      setLastTouchDistance(0);
    }
  }, [imageZoom]);

  // Handle zoom/pan gestures when modal is open
  useEffect(() => {
    if (!imageZoom) return;

    // 双指距离计算
    const getTouchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0;
      const touch1 = touches[0];
      const touch2 = touches[1];
      return Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
    };

    // 鼠标滚轮缩放（桌面端）
    const handleWheel = (event: WheelEvent) => {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault();
        const scaleChange = event.deltaY > 0 ? 0.9 : 1.1;
        setImageScale(prevScale => {
          const newScale = Math.min(Math.max(prevScale * scaleChange, 0.5), 5);
          return newScale;
        });
      }
    };

    // 鼠标拖拽（桌面端）
    const handleMouseDown = (event: MouseEvent) => {
      if (event.target instanceof HTMLImageElement && imageScale > 1) {
        setIsDragging(true);
        setDragStart({
          x: event.clientX - imagePosition.x,
          y: event.clientY - imagePosition.y
        });
        event.preventDefault();
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging && imageScale > 1) {
        setImagePosition({
          x: event.clientX - dragStart.x,
          y: event.clientY - dragStart.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    // 触摸手势（移动端）
    const handleTouchStart = (event: TouchEvent) => {
      if (event.target instanceof HTMLImageElement) {
        if (event.touches.length === 1 && imageScale > 1) {
          // 单指拖拽
          const touch = event.touches[0];
          setIsDragging(true);
          setDragStart({
            x: touch.clientX - imagePosition.x,
            y: touch.clientY - imagePosition.y
          });
        } else if (event.touches.length === 2) {
          // 双指缩放
          const distance = getTouchDistance(event.touches);
          setLastTouchDistance(distance);
          setIsDragging(false);
        }
        event.preventDefault();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.target instanceof HTMLImageElement) {
        if (event.touches.length === 1 && isDragging && imageScale > 1) {
          // 单指拖拽
          const touch = event.touches[0];
          setImagePosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
          });
        } else if (event.touches.length === 2) {
          // 双指缩放
          const distance = getTouchDistance(event.touches);
          if (lastTouchDistance > 0) {
            const scaleChange = distance / lastTouchDistance;
            setImageScale(prevScale => {
              const newScale = Math.min(Math.max(prevScale * scaleChange, 0.5), 5);
              return newScale;
            });
          }
          setLastTouchDistance(distance);
        }
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length === 0) {
        setIsDragging(false);
        setLastTouchDistance(0);
      } else if (event.touches.length === 1) {
        setLastTouchDistance(0);
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [imageZoom, imageScale, imagePosition, isDragging, dragStart, lastTouchDistance]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-muted)]">正在加载...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">错误: {error}</div>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-[var(--text-muted)]">选择一个文件开始阅读</div>
        </div>
      );
    }

    // 渲染处理后的 Markdown 内容，包括 Mermaid 图表和 GPX 地图
    if (renderedContent) {
      // Split HTML at placeholders and insert React components
      const parts = [];
      let currentHTML = renderedContent;
      let partIndex = 0;

      // Create a combined list of all components to insert, sorted by position
      const allComponents: Array<{
        index: number;
        type: 'mermaid' | 'track';
        data: { id: string; code: string; placeholder: string; isFile?: boolean };
      }> = [];

      // Add Mermaid diagrams
      mermaidDiagrams.forEach((diagram) => {
        const placeholder = `MERMAID_PLACEHOLDER_${diagram.id}`;
        const index = currentHTML.indexOf(placeholder);
        if (index !== -1) {
          allComponents.push({ index, type: 'mermaid', data: diagram });
        }
      });

      // Add track maps  
      trackMaps.forEach((map) => {
        const placeholder = `TRACK_PLACEHOLDER_${map.id}`;
        const index = currentHTML.indexOf(placeholder);
        if (index !== -1) {
          allComponents.push({ index, type: 'track', data: map });
        }
      });

      // Sort by position in the HTML
      allComponents.sort((a, b) => a.index - b.index);

      // Process components in order
      allComponents.forEach((component) => {
        const { type, data } = component;
        const placeholder = type === 'mermaid' 
          ? `MERMAID_PLACEHOLDER_${data.id}` 
          : `TRACK_PLACEHOLDER_${data.id}`;
        const placeholderIndex = currentHTML.indexOf(placeholder);
        
        if (placeholderIndex !== -1) {
          // Add HTML before placeholder
          if (placeholderIndex > 0) {
            const htmlBefore = currentHTML.substring(0, placeholderIndex);
            parts.push(
              <div
                key={`html-${partIndex++}`}
                dangerouslySetInnerHTML={{ __html: htmlBefore }}
              />
            );
          }
          
          // Add component
          if (type === 'mermaid') {
            parts.push(
              <MermaidDiagram
                key={data.id}
                code={data.code}
                className="mermaid-diagram"
              />
            );
          } else {
            parts.push(
              <TrackMap
                key={data.id}
                code={data.code}
                isFile={data.isFile}
                className="track-map"
              />
            );
          }
          
          // Update currentHTML to remaining part
          currentHTML = currentHTML.substring(placeholderIndex + placeholder.length);
        }
      });

      // Add any remaining HTML
      if (currentHTML.trim()) {
        parts.push(
          <div
            key={`html-${partIndex}`}
            dangerouslySetInnerHTML={{ __html: currentHTML }}
          />
        );
      }

      return (
        <div className="markdown-viewer" ref={contentRef}>
          {/* File name as document title */}
          {activeFile && (
            <h1 className="text-2xl font-bold mb-6 text-[var(--text-normal)] border-b border-[var(--background-modifier-border)] pb-4">
              {decodeURIComponent(activeFile).split('/').pop()?.replace('.md', '') || 'Document'}
            </h1>
          )}
          
          {/* File tags from LocalTagAPI */}
          {fileTags.length > 0 && (
            <div className="frontmatter-tags mb-6">
              <span className="tags-label text-sm text-[var(--text-muted)] mr-2">Tags:</span>
              {fileTags.map((tag, index) => (
                <span
                  key={index}
                  className="tag frontmatter-tag inline-block px-2 py-1 mr-2 mb-1 text-xs bg-[var(--background-secondary)] text-[var(--text-accent)] rounded-md border border-[var(--background-modifier-border)] hover:bg-[var(--interactive-hover)] cursor-pointer transition-colors"
                  data-tag={tag.replace('#', '')}
                  onClick={() => {
                    console.log('Tag clicked:', tag);
                    // TODO: Implement tag search/filter
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {parts}
          
          {/* Cusdis 评论系统 */}
          {frontMatter?.uuid && activeFile && (
            <CusdisComments
              pageId={frontMatter.uuid}
              pageTitle={decodeURIComponent(activeFile).split('/').pop()?.replace('.md', '') || 'Document'}
              pageUrl={window.location.href}
            />
          )}
        </div>
      );
    }

    // Fallback for no rendered content
    return (
      <div className="markdown-viewer">
        {/* File name as document title */}
        {activeFile && (
          <h1 className="text-2xl font-bold mb-6 text-[var(--text-normal)] border-b border-[var(--background-modifier-border)] pb-4">
            {decodeURIComponent(activeFile).split('/').pop()?.replace('.md', '') || 'Document'}
          </h1>
        )}
        <pre className="whitespace-pre-wrap font-sans text-[var(--text-normal)] bg-transparent border-none p-0">
          {content}
        </pre>
      </div>
    );
  };

  return (
    <div className="h-full">
      <div style={{ maxWidth: '1200px', padding: '1.5rem' }}>
        {renderContent()}
      </div>
      
      {/* Image Zoom Modal */}
      {imageZoom && (
        <div 
          className={`image-zoom-modal ${imageZoom ? 'show' : ''}`}
          onClick={(e) => {
            // 只有点击背景（非图片）才关闭
            if (e.target === e.currentTarget) {
              setImageZoom(null);
            }
          }}
        >
          <div className="close-hint">
            点击空白处关闭 • 滚轮/双指缩放
          </div>
          <img 
            src={imageZoom.src} 
            alt={imageZoom.alt}
            style={{
              transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${imageScale})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-out',
              cursor: imageScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
              userSelect: 'none',
              touchAction: 'none' // 防止浏览器默认的触摸行为
            }}
            onClick={(e) => {
              e.stopPropagation(); // 防止点击图片时关闭模态框
            }}
            onDragStart={(e) => e.preventDefault()} // 防止图片拖拽
          />
          
          {/* 缩放指示器 */}
          {imageScale !== 1 && (
            <div className="zoom-indicator">
              {Math.round(imageScale * 100)}%
            </div>
          )}
        </div>
      )}
    </div>
  );
}