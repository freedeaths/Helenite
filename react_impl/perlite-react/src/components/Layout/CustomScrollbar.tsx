import { ReactNode } from 'react';

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
        ${showScrollbar 
          ? `
            [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar]:bg-transparent
            [&::-webkit-scrollbar-track]:bg-[var(--background-secondary)]
            [&::-webkit-scrollbar-track]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-[var(--background-modifier-border)]
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb:hover]:bg-[var(--interactive-accent)]
            [&::-webkit-scrollbar-corner]:bg-transparent
            
            /* Firefox scrollbar styling */
            scrollbar-width: thin
            scrollbar-color: var(--background-modifier-border) var(--background-secondary)
            
            /* Custom hover effects */
            hover:[&::-webkit-scrollbar-thumb]:bg-[var(--interactive-accent)]
            hover:[&::-webkit-scrollbar-thumb]:opacity-80
          `
          : 'scrollbar-none'
        }
      `}
    >
      {children}
    </div>
  );
}

// CSS utility classes for scrollbar styling - add to your global CSS
export const scrollbarStyles = `
  /* Custom scrollbar for webkit browsers */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .custom-scrollbar::-webkit-scrollbar-track {
    background: var(--background-secondary);
    border-radius: 4px;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--background-modifier-border);
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: var(--interactive-accent);
  }

  .custom-scrollbar::-webkit-scrollbar-corner {
    background: transparent;
  }

  /* Firefox scrollbar */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: var(--background-modifier-border) var(--background-secondary);
  }

  /* Hide scrollbar but keep functionality */
  .scrollbar-none {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-none::-webkit-scrollbar {
    display: none;
  }

  /* Mobile optimized scrollbar */
  @media (max-width: 768px) {
    .mobile-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    
    .mobile-scrollbar::-webkit-scrollbar-thumb {
      background: var(--interactive-accent);
      border-radius: 2px;
    }
  }
`;