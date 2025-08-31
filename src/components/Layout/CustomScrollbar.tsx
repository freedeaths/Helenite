import type { ReactNode } from 'react';

interface CustomScrollbarProps {
  children: ReactNode;
  className?: string;
  showScrollbar?: boolean;
}

export function CustomScrollbar({ 
  children, 
  className = '', 
  showScrollbar = true 
}: CustomScrollbarProps) {
  return (
    <div 
      className={`
        ${className}
        ${showScrollbar ? 'custom-scrollbar' : 'scrollbar-none'}
      `}
    >
      {children}
    </div>
  );
}

