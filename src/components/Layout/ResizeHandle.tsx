import { useCallback, useEffect, useRef } from 'react';

interface ResizeHandleProps {
  direction: 'left' | 'right';
  onResize: (width: number) => void;
  minWidth: number;
  maxWidth: number;
  sidebarRef: React.RefObject<HTMLDivElement | null>;
}

export function ResizeHandle({ direction, onResize, minWidth, maxWidth, sidebarRef }: ResizeHandleProps) {
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!sidebarRef.current) return;

    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = sidebarRef.current.offsetWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sidebarRef]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;

    const deltaX = direction === 'left' ? e.clientX - startX.current : startX.current - e.clientX;
    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth.current + deltaX));

    onResize(newWidth);
  }, [direction, onResize, minWidth, maxWidth]);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      className="w-1 cursor-col-resize hover:bg-[var(--interactive-accent)] hover:opacity-100 opacity-0 transition-opacity flex-shrink-0"
      onMouseDown={handleMouseDown}
      style={{
        background: isDragging.current ? 'var(--interactive-accent)' : 'transparent'
      }}
    />
  );
}