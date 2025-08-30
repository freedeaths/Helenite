import { useCallback, useEffect, useState } from 'react';

interface ResizeHandleProps {
  direction: 'left' | 'right';
  onResize: (width: number) => void;
  currentWidth: number;
  minWidth?: number;
  maxWidth?: number;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
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

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && sidebarRef.current) {
        const rect = sidebarRef.current.getBoundingClientRect();
        let newWidth: number;
        
        if (direction === 'left') {
          // For left sidebar: calculate from mouse position to real-time left edge
          newWidth = mouseMoveEvent.clientX - rect.left;
        } else {
          // For right sidebar: width = real-time right edge - mouseX
          newWidth = rect.right - mouseMoveEvent.clientX;
        }
        
        // Constrain within bounds
        const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        
        // Update immediately
        onResize(constrainedWidth);
      }
    },
    [isResizing, direction, minWidth, maxWidth, onResize, sidebarRef]
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
        cursor-ew-resize z-20 flex-shrink-0 relative
        ${isHovered || isResizing 
          ? 'bg-[var(--interactive-accent)] opacity-100' 
          : 'bg-[var(--background-modifier-border)] opacity-50 hover:opacity-100'
        }
      `}
      style={{
        width: isHovered || isResizing ? '2px' : '1px',
        height: '100%',
        transition: 'width 0.2s ease'
      }}
      onMouseDown={startResizing}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
    </div>
  );
}