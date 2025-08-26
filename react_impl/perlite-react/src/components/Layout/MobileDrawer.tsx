import { ReactNode, useEffect } from 'react';
import { IconX } from '@tabler/icons-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side: 'left' | 'right';
  children: ReactNode;
  title: string;
}

export function MobileDrawer({ isOpen, onClose, side, children, title }: MobileDrawerProps) {
  // Handle backdrop click and escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div
        className={`
          fixed top-0 bottom-0 z-50 w-80 max-w-[85vw]
          bg-[var(--background-primary)] border-[var(--background-modifier-border)]
          transform transition-transform duration-300 ease-in-out
          ${side === 'left' ? 'border-r' : 'border-l'}
          ${isOpen 
            ? 'translate-x-0'
            : side === 'left' 
              ? '-translate-x-full' 
              : 'translate-x-full'
          }
        `}
        style={{
          [side === 'left' ? 'left' : 'right']: 0
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--background-modifier-border)]">
          <h2 className="text-sm font-medium text-[var(--text-normal)]">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--background-modifier-hover)] text-[var(--text-muted)] hover:text-[var(--text-normal)] transition-colors"
            aria-label="Close drawer"
          >
            <IconX size={18} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </>
  );
}