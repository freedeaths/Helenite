
import { useEffect, useState } from 'react';
import { useVaultStore } from '../../stores/vaultStore';
import { useUIStore } from '../../stores/uiStore';

export function TOC() {
  const { currentDocumentMetadata } = useVaultStore();
  const [activeHeadingId, setActiveHeadingId] = useState<string>('');

  // Scroll to heading when clicked
  const handleHeadingClick = (id: string) => {
    const { isMobile, setMobileDropdownOpen } = useUIStore.getState();
    
    // Prevent default hash navigation to avoid conflicts with useHashRouter
    // We'll handle the scrolling ourselves
    
    // Helper function to find scroll container for a given element
    const findScrollContainer = (targetElement: HTMLElement): HTMLElement | null => {
      // Method 1: Look for the main content div with flex-1 overflow-auto
      const mainContentContainers = document.querySelectorAll('div.flex-1.overflow-auto');
      
      for (const container of mainContentContainers) {
        const htmlContainer = container as HTMLElement;
        if (htmlContainer.contains(targetElement)) {
          return htmlContainer;
        }
      }
      
      // Method 2: Look for any scrollable parent by walking up the DOM tree
      let currentElement = targetElement.parentElement;
      while (currentElement && currentElement !== document.body) {
        const computedStyle = window.getComputedStyle(currentElement);
        const hasScroll = computedStyle.overflowY === 'auto' || 
                         computedStyle.overflowY === 'scroll' || 
                         computedStyle.overflow === 'auto' || 
                         computedStyle.overflow === 'scroll';
        
        if (hasScroll && currentElement.scrollHeight > currentElement.clientHeight) {
          return currentElement;
        }
        currentElement = currentElement.parentElement;
      }
      
      // Method 3: Fallback to any scrollable container that contains our element
      const allScrollableContainers = document.querySelectorAll('*[style*="overflow"], .overflow-auto, .overflow-y-auto');
      
      for (const container of allScrollableContainers) {
        const htmlContainer = container as HTMLElement;
        if (htmlContainer.contains(targetElement) && htmlContainer.scrollHeight > htmlContainer.clientHeight) {
          return htmlContainer;
        }
      }
      return null;
    };
    
    // Perform the actual scroll operation with retry mechanism
    const executeScroll = (retryCount = 0, isRetry = false) => {
      // Get fresh element reference to avoid stale DOM references
      const element = document.getElementById(id);
      if (!element) {
        // If element not found and we haven't retried too many times, retry after a delay
        if (retryCount < 3) {
          console.log(`🎯 TOC: Element "${id}" not found, retrying... (attempt ${retryCount + 1})`);
          setTimeout(() => executeScroll(retryCount + 1, true), 100);
          return;
        }
        console.warn(`🎯 TOC: Element with id "${id}" not found after ${retryCount} retries`);
        return;
      }
      
      const scrollContainer = findScrollContainer(element);
      if (!scrollContainer) {
        console.warn(`🎯 TOC: No scroll container found for element "${id}"`);
        return;
      }
      
      // Get precise positions - use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        // CRITICAL FIX: Use getBoundingClientRect for accurate position calculation
        // Don't use offsetTop as it's relative to offsetParent which may not be the scroll container
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        // Calculate the element's position relative to the scroll container
        // This accounts for the current scroll position
        const elementRelativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        
        // Small offset to account for sticky header, but let heading's margin-top provide spacing
        const scrollOffset = 10; // Just a small offset, heading has its own margin-top: 2rem (32px)
        const targetScrollTop = Math.max(0, elementRelativeTop - scrollOffset);
        
        console.log(`🎯 [${isMobile ? 'MOBILE' : 'DESKTOP'}] TOC Navigation ${isRetry ? '(RETRY)' : '(INITIAL)'}:
          Target: ${id}
          Container: ${scrollContainer.className}
          Container scroll: ${scrollContainer.scrollTop}px → ${targetScrollTop}px
          Element rect: ${elementRect.top}px (viewport)
          Container rect: ${containerRect.top}px (viewport)
          Element relative: ${elementRelativeTop}px (within container)`);
        
        // Store the target position for verification (removed unused variable)
        
        // Cancel any existing smooth scrolls by using instant scroll first
        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: 'instant'
        });
        
        // Verify the scroll actually happened
        requestAnimationFrame(() => {
          const afterInstantScroll = scrollContainer.scrollTop;
          const scrollDiff = Math.abs(afterInstantScroll - targetScrollTop);
          
          if (scrollDiff > 5) {
            console.warn(`🎯 TOC: Scroll position mismatch! Expected: ${targetScrollTop}px, Got: ${afterInstantScroll}px, Diff: ${scrollDiff}px`);
            
            // If this is the first attempt and there's a significant difference, retry
            if (!isRetry && retryCount === 0) {
              console.log('🎯 TOC: Retrying scroll due to position mismatch...');
              setTimeout(() => executeScroll(1, true), 150);
              return;
            }
          }
          
          // Apply smooth scroll for visual effect
          scrollContainer.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
          
          // Final verification after smooth scroll completes
          setTimeout(() => {
            const finalScrollTop = scrollContainer.scrollTop;
            const finalDiff = Math.abs(finalScrollTop - targetScrollTop);
            console.log(`🎯 TOC: Final position - Expected: ${targetScrollTop}px, Actual: ${finalScrollTop}px, Diff: ${finalDiff}px`);
          }, 500);
        });
      });
    };
    
    // On mobile, close drawer first, then scroll after animation
    if (isMobile) {
      // Close drawer immediately
      setMobileDropdownOpen(false);
      
      // Wait for drawer close animation + extra DOM settling time
      setTimeout(() => {
        // Use double requestAnimationFrame for better stability
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            executeScroll();
          });
        });
      }, 350); // Increased from 320ms to 350ms for more stability
    } else {
      // On desktop, scroll immediately
      executeScroll();
    }
  };

  // Track active heading based on scroll position
  useEffect(() => {
    if (!currentDocumentMetadata?.headings) return;

    // Use the same improved container finding logic as handleHeadingClick
    const findMainContentScrollContainer = () => {
      // Method 1: Look for the main content div with flex-1 overflow-auto
      const mainContentContainers = document.querySelectorAll('div.flex-1.overflow-auto');
      
      for (const container of mainContentContainers) {
        const htmlContainer = container as HTMLElement;
        if (htmlContainer.scrollHeight > htmlContainer.clientHeight) {
          return htmlContainer;
        }
      }
      
      // Method 2: Look for markdown viewer and walk up to find scrollable parent
      const markdownViewers = document.querySelectorAll('.markdown-viewer');
      if (markdownViewers.length > 0) {
        let element = markdownViewers[0].parentElement;
        while (element && element !== document.body) {
          const computedStyle = window.getComputedStyle(element);
          const hasScroll = computedStyle.overflowY === 'auto' || 
                           computedStyle.overflowY === 'scroll' || 
                           computedStyle.overflow === 'auto' || 
                           computedStyle.overflow === 'scroll';
          
          if (hasScroll && element.scrollHeight > element.clientHeight) {
            return element as HTMLElement;
          }
          element = element.parentElement;
        }
      }
      
      return null;
    };

    const updateActiveHeading = () => {
      const scrollContainer = findMainContentScrollContainer();
      if (!scrollContainer) return;

      const headings = currentDocumentMetadata.headings
        .map(heading => ({
          ...heading,
          element: document.getElementById(heading.id)
        }))
        .filter(heading => heading.element);

      // Find the currently visible heading
      let currentHeading = '';
      const scrollOffset = 30; // Small offset for better UX when tracking active heading
      const scrollTop = scrollContainer.scrollTop + scrollOffset;

      for (const heading of headings) {
        const element = heading.element!;
        // Calculate element's actual offset within the scroll container
        const containerRect = scrollContainer.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        const elementRelativeTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;
        
        if (elementRelativeTop <= scrollTop) {
          currentHeading = heading.id;
        } else {
          break;
        }
      }

      setActiveHeadingId(currentHeading);
    };

    // Initial check
    updateActiveHeading();

    // Find the scroll container and listen for its scroll events
    const scrollContainer = findMainContentScrollContainer();
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateActiveHeading, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', updateActiveHeading);
    }
  }, [currentDocumentMetadata]);

  if (!currentDocumentMetadata?.headings?.length) {
    return (
      <div className="h-full flex flex-col">
        <div className="text-sm font-medium mb-4 text-[var(--text-normal)] px-4 pt-4">
          Table of Contents
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="text-sm text-[var(--text-muted)]">
            No headings found in this document
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="text-sm font-medium mb-4 text-[var(--text-normal)] px-4 pt-4">
        Table of Contents
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
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
    </div>
  );
}