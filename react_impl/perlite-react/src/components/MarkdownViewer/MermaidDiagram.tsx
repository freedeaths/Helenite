import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { useUIStore } from '../../stores/uiStore';

interface MermaidDiagramProps {
  code: string;
  className?: string;
}

let mermaidInitialized = false;
let currentTheme: string | null = null;

export function MermaidDiagram({ code, className = '' }: MermaidDiagramProps) {
  const { theme } = useUIStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [diagramId] = useState(`mermaid-${Math.random().toString(36).substring(2, 11)}`);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isThemeChanging, setIsThemeChanging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Add window resize handler for responsive updates
  useEffect(() => {
    const handleResize = () => {
      // Debounced resize handling
      setTimeout(() => {
        if (containerRef.current && containerRef.current.querySelector('svg')) {
          const svgElement = containerRef.current.querySelector('svg') as SVGSVGElement;
          if (svgElement) {
            // Recalculate responsive dimensions on resize
            const container = containerRef.current;
            const containerWidth = Math.max(300, container.clientWidth - 32);
            const containerHeight = Math.max(200, window.innerHeight - 160);
            
            // Maintain aspect ratio while fitting new container size
            const viewBox = svgElement.getAttribute('viewBox');
            if (viewBox) {
              const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
              if (vbWidth > 0 && vbHeight > 0) {
                const aspectRatio = vbWidth / vbHeight;
                
                let targetWidth = Math.min(Math.max(vbWidth, 300), containerWidth);
                let targetHeight = targetWidth / aspectRatio;
                
                if (targetHeight > containerHeight) {
                  targetHeight = Math.min(containerHeight, Math.max(targetHeight, 200));
                  targetWidth = targetHeight * aspectRatio;
                }
                
                // Ensure positive dimensions
                targetWidth = Math.max(targetWidth, 300);
                targetHeight = Math.max(targetHeight, 200);
                
                svgElement.setAttribute('width', targetWidth.toString());
                svgElement.setAttribute('height', targetHeight.toString());
              }
            }
          }
        }
      }, 100); // 100ms debounce
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 更新SVG transform
  const updateSVGTransform = useCallback(() => {
    if (svgRef.current) {
      svgRef.current.style.transform = `translate(${position.x}px, ${position.y}px) scale(${zoomLevel})`;
      svgRef.current.style.transformOrigin = 'center';
    }
  }, [position.x, position.y, zoomLevel]);

  // 缩放控制函数
  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel * 1.2, 3); // 最大3倍缩放
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel / 1.2, 0.5); // 最小0.5倍缩放
    setZoomLevel(newZoom);
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  // 移除未使用的 handleMouseDown 函数

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 添加全局拖拽事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 更新transform当zoom或position改变时
  useEffect(() => {
    updateSVGTransform();
  }, [position.x, position.y, zoomLevel, updateSVGTransform]);

  useEffect(() => {
    let isMounted = true; // 防止组件卸载后继续执行
    
    const renderMermaid = async () => {
      if (!containerRef.current || !isMounted) {
        return;
      }

      try {
        if (!isMounted) return;
        setError(null);

        // Determine mermaid theme based on UI theme
        const mermaidTheme = theme === 'dark' ? 'dark' : 'default';
        
        // Check if theme is changing
        const themeChanged = currentTheme !== null && currentTheme !== mermaidTheme;
        
        // 只有首次渲染时显示 loading，主题切换时不显示
        if (currentTheme === null) {
          setIsLoading(true);
        }
        
        // 主题切换时只显示简短的切换状态
        if (themeChanged && !isThemeChanging) {
          setIsThemeChanging(true);
        }
        
        // 只在第一次初始化或主题真正变化时重新初始化
        if (!mermaidInitialized || (currentTheme !== null && currentTheme !== mermaidTheme)) {
          // 避免频繁重新初始化导致闪烁
          if (currentTheme !== null && currentTheme !== mermaidTheme) {
            // 主题变化时，快速静默切换
            setIsThemeChanging(true);
          }
          
          mermaid.initialize({
            startOnLoad: false,
            theme: 'base',  // 使用 base 主题以便更好地控制样式
            securityLevel: 'loose',
            fontFamily: 'inherit',
            logLevel: 'error', // 减少控制台输出
            // Enhanced responsiveness settings
            flowchart: {
              useMaxWidth: false, // 关闭自动最大宽度，手动控制
              htmlLabels: true,
              curve: 'basis'
            },
            sequence: {
              useMaxWidth: false,
              wrap: true,
              width: 150
            },
            gantt: {
              useMaxWidth: false,
              fontSize: 12,
              gridLineStartPadding: 350
            },
            pie: {
              useMaxWidth: false
            },
            journey: {
              useMaxWidth: false
            },
            timeline: {
              useMaxWidth: false
            },
            mindmap: {
              useMaxWidth: false
            },
            // 自定义主题变量以实现平滑主题切换
            themeVariables: {
              primaryColor: mermaidTheme === 'dark' ? '#6c8cff' : '#5470c6',
              primaryTextColor: mermaidTheme === 'dark' ? '#ffffff' : '#000000',
              primaryBorderColor: mermaidTheme === 'dark' ? '#5a7ae0' : '#4a5568',
              lineColor: mermaidTheme === 'dark' ? '#6c8cff' : '#5470c6',
              secondaryColor: mermaidTheme === 'dark' ? '#2d2d2d' : '#f5f5f5',
              tertiaryColor: mermaidTheme === 'dark' ? '#1a1a1a' : '#ffffff',
              background: mermaidTheme === 'dark' ? '#1a1a1a' : '#ffffff',
              mainBkg: mermaidTheme === 'dark' ? '#2d2d2d' : '#f9f9f9',
              secondBkg: mermaidTheme === 'dark' ? '#444444' : '#efefef',
              fontSize: '14px'
            }
          });
          mermaidInitialized = true;
          currentTheme = mermaidTheme;
        }

        // 渲染新的 SVG 内容到临时 div（双缓冲策略）
        if (!isMounted) return;
        const { svg } = await mermaid.render(diagramId, code);
        
        // Check if component is still mounted before updating DOM
        if (!isMounted || !containerRef.current) {
          return;
        }
        
        // 创建临时容器进行预处理
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = svg;
        const newSvgElement = tempDiv.querySelector('svg');
        
        if (newSvgElement && isMounted) {
          // 如果是主题切换，先隐藏旧内容
          if (themeChanged && containerRef.current.firstChild) {
            const oldSvg = containerRef.current.querySelector('svg');
            if (oldSvg) {
              oldSvg.style.opacity = '0';
            }
          }
          // 完全自然的SVG尺寸，不强制调整
          try {
            // 保持SVG的原始尺寸和viewBox
            const bbox = newSvgElement.getBBox();
            
            if (bbox.width > 0 && bbox.height > 0) {
              // 保持原始viewBox，让SVG自然渲染
              if (!newSvgElement.getAttribute('viewBox')) {
                newSvgElement.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);
              }
              
              // 移除固定的width和height，让SVG自适应
              newSvgElement.removeAttribute('width');
              newSvgElement.removeAttribute('height');
            }
            
            // 设置CSS样式让SVG自适应容器
            newSvgElement.style.maxWidth = '100%';
            newSvgElement.style.height = 'auto';
            newSvgElement.style.display = 'block';
            newSvgElement.style.margin = '0';
            newSvgElement.style.cursor = 'grab';
            newSvgElement.style.userSelect = 'none';
            
          } catch (e) {
            console.warn('Could not process SVG, using as-is:', e);
            // 出错时也保持简单样式
            newSvgElement.style.maxWidth = '100%';
            newSvgElement.style.height = 'auto';
            newSvgElement.style.display = 'block';
            newSvgElement.style.margin = '0';
            newSvgElement.style.cursor = 'grab';
            newSvgElement.style.userSelect = 'none';
          }
          
          // 平滑替换内容
          if (themeChanged && containerRef.current.firstChild) {
            // 主题切换时先准备新 SVG
            newSvgElement.style.opacity = '0';
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(newSvgElement);
            
            // 使用 requestAnimationFrame 确保 DOM 更新后再显示
            requestAnimationFrame(() => {
              if (newSvgElement) {
                newSvgElement.style.opacity = '1';
                newSvgElement.style.transition = 'opacity 0.15s ease';
              }
            });
          } else {
            // 首次渲染直接替换
            containerRef.current.innerHTML = '';
            containerRef.current.appendChild(newSvgElement);
          }
          
          // 添加拖拽事件监听
          newSvgElement.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
              setIsDragging(true);
              setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
              e.preventDefault();
              newSvgElement.style.cursor = 'grabbing';
            }
          });
          
          // 保存SVG引用并应用当前变换
          svgRef.current = newSvgElement;
          updateSVGTransform();
        }
        
        // 延迟清除主题变化状态，确保动画完成
        if (isThemeChanging) {
          setTimeout(() => {
            if (isMounted) {
              setIsThemeChanging(false);
            }
          }, themeChanged ? 200 : 0); // 主题切换时延迟200ms
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (!isMounted) return;
        
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="
              padding: 1rem;
              border: 1px solid var(--background-modifier-border);
              border-radius: 4px;
              background: var(--background-secondary);
              color: var(--text-muted);
              text-align: center;
            ">
              <p style="margin: 0; font-size: 14px;">
                ⚠️ Mermaid diagram error: ${err instanceof Error ? err.message : 'Unknown error'}
              </p>
              <details style="margin-top: 0.5rem;">
                <summary style="cursor: pointer; font-size: 12px;">Show source</summary>
                <pre style="
                  margin: 0.5rem 0 0 0;
                  padding: 0.5rem;
                  background: var(--background-primary);
                  border-radius: 2px;
                  font-size: 11px;
                  text-align: left;
                  overflow-x: auto;
                ">${code}</pre>
              </details>
            </div>
          `;
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          // Always clear theme changing state in finally block
          if (isThemeChanging) {
            setIsThemeChanging(false);
          }
        }
      }
    };

    // Add a small delay to prevent race conditions
    const timeoutId = setTimeout(renderMermaid, 50);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [code, diagramId, theme, isThemeChanging]);

  return (
    <div 
      className={`mermaid-container ${className}`}
      style={{ 
        position: 'relative',
        margin: '1rem auto',
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {(isLoading && !isThemeChanging) && (
        <div style={{
          padding: '2rem',
          color: 'var(--text-muted)',
          fontSize: '14px'
        }}>
          Rendering diagram...
        </div>
      )}
      {isThemeChanging && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'transparent', // 透明背景减少闪烁
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5, // 降低 z-index
          fontSize: '12px',
          color: 'var(--text-muted)',
          opacity: 0.7,
          pointerEvents: 'none' // 不阻止交互
        }}>
          🎨
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{
          position: 'relative',
          width: '100%',
          minHeight: '200px', // 最小高度确保可见
          maxHeight: 'calc(100vh - 100px)', // 最大高度限制，防止过高
          overflow: 'auto', // 超出时显示滚动条
          backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
          borderRadius: '8px',
          border: `1px solid ${theme === 'dark' ? '#444' : '#e0e0e0'}`,
          padding: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start', // 上对齐而不是居中
          transition: isThemeChanging ? 'none' : 'background-color 0.2s ease, border-color 0.2s ease'
        }}
      />
      
      {/* 浮动工具栏 */}
      {!isLoading && !error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: theme === 'dark' ? 'rgba(45, 45, 45, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '6px',
          boxShadow: theme === 'dark' ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          border: `1px solid ${theme === 'dark' ? 'rgba(68, 68, 68, 0.5)' : 'rgba(224, 224, 224, 0.5)'}`,
          zIndex: 10
        }}>
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            style={{
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: '6px',
              background: zoomLevel <= 0.5 
                ? (theme === 'dark' ? '#333' : '#f0f0f0') 
                : (theme === 'dark' ? '#404040' : '#ffffff'),
              color: zoomLevel <= 0.5 
                ? (theme === 'dark' ? '#666' : '#ccc') 
                : (theme === 'dark' ? '#e0e0e0' : '#333'),
              cursor: zoomLevel <= 0.5 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="缩小"
          >
            −
          </button>
          
          <div style={{
            minWidth: '42px',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: '500',
            color: theme === 'dark' ? '#e0e0e0' : '#666',
            padding: '0 4px'
          }}>
            {Math.round(zoomLevel * 100)}%
          </div>
          
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            style={{
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: '6px',
              background: zoomLevel >= 3 
                ? (theme === 'dark' ? '#333' : '#f0f0f0') 
                : (theme === 'dark' ? '#404040' : '#ffffff'),
              color: zoomLevel >= 3 
                ? (theme === 'dark' ? '#666' : '#ccc') 
                : (theme === 'dark' ? '#e0e0e0' : '#333'),
              cursor: zoomLevel >= 3 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="放大"
          >
            +
          </button>
          
          <div style={{
            width: '1px',
            height: '20px',
            backgroundColor: theme === 'dark' ? '#444' : '#e0e0e0',
            margin: '0 2px'
          }} />
          
          <button
            onClick={handleResetZoom}
            style={{
              width: '28px',
              height: '28px',
              border: 'none',
              borderRadius: '6px',
              background: theme === 'dark' ? '#404040' : '#ffffff',
              color: theme === 'dark' ? '#e0e0e0' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            title="重置视图"
          >
            ↻
          </button>
        </div>
      )}
      
      {/* 拖拽提示 */}
      {!isLoading && !error && zoomLevel > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '12px',
          color: theme === 'dark' ? 'rgba(224, 224, 224, 0.6)' : 'rgba(102, 102, 102, 0.6)',
          backgroundColor: theme === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          padding: '4px 8px',
          borderRadius: '4px',
          backdropFilter: 'blur(5px)',
          pointerEvents: 'none'
        }}>
          拖拽移动视图
        </div>
      )}
    </div>
  );
}