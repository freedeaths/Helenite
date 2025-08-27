
import { useEffect, useState } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { useUIStore } from '../../stores/uiStore';

export function TOC() {
  const { currentDocumentMetadata } = useVaultStore();
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  // Scroll to heading when clicked
  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const { isMobile, setMobileDropdownOpen } = useUIStore.getState();
      
      // Always close dropdown first on mobile
      if (isMobile) {
        setMobileDropdownOpen(false);
      }
      
      // Calculate position with header offset
      const headerHeight = 40; // ViewHeader height in px
      const elementTop = element.offsetTop;
      const scrollContainer = element.closest('.overflow-auto') || window;
      
      if (scrollContainer === window) {
        window.scrollTo({
          top: elementTop - headerHeight,
          behavior: 'smooth'
        });
      } else {
        scrollContainer.scrollTo({
          top: elementTop - headerHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  // Track active heading based on scroll position
  useEffect(() => {
    if (!currentDocumentMetadata?.headings) return;

    const updateActiveHeading = () => {
      const headings = currentDocumentMetadata.headings
        .map(heading => ({
          ...heading,
          element: document.getElementById(heading.id)
        }))
        .filter(heading => heading.element);

      // Find the currently visible heading
      let currentHeading = '';
      const scrollTop = window.scrollY + 100; // Add offset for better UX

      for (const heading of headings) {
        if (heading.element!.offsetTop <= scrollTop) {
          currentHeading = heading.id;
        } else {
          break;
        }
      }

      setActiveHeadingId(currentHeading);
    };

    // Initial check
    updateActiveHeading();

    // Listen for scroll events
    window.addEventListener('scroll', updateActiveHeading, { passive: true });
    return () => window.removeEventListener('scroll', updateActiveHeading);
  }, [currentDocumentMetadata]);

  if (!currentDocumentMetadata?.headings?.length) {
    return (
      <div className="h-full p-4">
        <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
          Table of Contents
        </div>
        <div className="text-sm text-[var(--text-muted)]">
          No headings found in this document
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <div className="text-sm font-medium mb-4 text-[var(--text-normal)]">
        Table of Contents
      </div>
      <div className="space-y-1 text-sm">
        {currentDocumentMetadata.headings.map((heading, index) => {
          const indent = (heading.level - 1) * 12; // 12px per level for cleaner look
          const isActive = activeHeadingId === heading.id;
          
          // Font size based on heading level
          const getFontSize = (level: number) => {
            switch (level) {
              case 1: return 'text-sm font-semibold';
              case 2: return 'text-sm font-medium';
              case 3: return 'text-xs font-medium';
              case 4: return 'text-xs';
              case 5: return 'text-xs';
              case 6: return 'text-xs';
              default: return 'text-xs';
            }
          };
          
          return (
            <div
              key={`${heading.id}-${index}`}
              className={`
                cursor-pointer py-1.5 px-2 rounded transition-all duration-200 border-l-2
                ${isActive 
                  ? 'text-[var(--interactive-accent)] border-l-[var(--interactive-accent)] bg-[var(--background-modifier-hover)]' 
                  : 'text-[var(--text-normal)] border-l-transparent hover:text-[var(--interactive-accent)] hover:border-l-[var(--interactive-accent)] hover:bg-[var(--background-modifier-hover)]'
                }
                ${getFontSize(heading.level)}
              `}
              style={{ 
                marginLeft: `${indent}px`,
                paddingLeft: `${8 + (heading.level - 1) * 4}px` // Progressive indentation
              }}
              onClick={() => handleHeadingClick(heading.id)}
              title={heading.text}
            >
              <span className="line-clamp-2">
                {heading.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}