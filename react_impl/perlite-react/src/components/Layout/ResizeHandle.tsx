import { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeHandleProps {
  direction: 'left' | 'right';
  onResize: (width: number) => void;
  currentWidth: number;
  minWidth?: number;
  maxWidth?: number;
  sidebarRef: React.RefObject<HTMLDivElement>;
}

export function ResizeHandle({ 
  direction, 
  onResize, 
  currentWidth, 
  minWidth = 200, 
  maxWidth = 600,
  sidebarRef
}: ResizeHandleProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const sidebarLeftRef = useRef(0);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
    
    // Cache sidebar position at start of drag to avoid repeated getBoundingClientRect calls
    if (sidebarRef.current) {
      const rect = sidebarRef.current.getBoundingClientRect();
      sidebarLeftRef.current = direction === 'left' ? rect.left : rect.right;
    }
  }, [direction, sidebarRef]);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        let newWidth: number;
        
        if (direction === 'left') {
          // For left sidebar: calculate from mouse position to cached left edge
          newWidth = mouseMoveEvent.clientX - sidebarLeftRef.current;
        } else {
          // For right sidebar: width = cached right edge - mouseX
          newWidth = sidebarLeftRef.current - mouseMoveEvent.clientX;
        }
        
        // Constrain within bounds
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        // Update immediately
        onResize(constrainedWidth);
      }
    },
    [isResizing, direction, minWidth, maxWidth, onResize]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div
      className={`
        absolute cursor-ew-resize z-20 
        ${direction === 'left' ? 'left-0' : 'left-0'}
        ${isHovered || isResizing 
          ? 'bg-[var(--interactive-accent)] opacity-100' 
          : 'bg-[var(--background-modifier-border)] opacity-50 hover:opacity-100'
        }
      `}
      style={{
        top: 0,
        bottom: 0,
        width: '2px',
        height: '100%'
      }}
      onMouseDown={startResizing}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Visual indicator when hovering or dragging */}
      <div className={`
        absolute inset-y-0 -inset-x-0.5
        transition-opacity duration-200
        ${isHovered || isResizing ? 'opacity-100' : 'opacity-0'}
        bg-[var(--interactive-accent)] bg-opacity-20
      `} />
    </div>
  );
}