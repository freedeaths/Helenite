import { IconFiles, IconList, IconNetwork, IconTags } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { FileExplorer } from '../FileExplorer/FileExplorer';
import { TOC } from '../MarkdownViewer/TOC';
import { LocalGraph } from '../Graph/LocalGraph';
import { TagsPanel } from '../MarkdownViewer/TagsPanel';

export function MobileDropdownMenu() {
  const {
    mobileDropdownOpen,
    setMobileDropdownOpen,
    activeMobileTab,
    setActiveMobileTab
  } = useUIStore();
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle visibility and animation states
  useEffect(() => {
    if (mobileDropdownOpen) {
      setIsVisible(true);
      // Use requestAnimationFrame for more reliable rendering timing
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Use transitionend event instead of setTimeout for more reliable cleanup
      const cleanup = setTimeout(() => setIsVisible(false), 250); // Slightly longer timeout
      return () => clearTimeout(cleanup);
    }
  }, [mobileDropdownOpen]);

  // Handle click outside to close
  useEffect(() => {
    if (!mobileDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the dropdown content and not on the toggle button
      const target = event.target as Element;
      const isToggleButton = target.closest('[data-mobile-dropdown-toggle]');
      
      if (contentRef.current && !contentRef.current.contains(target) && !isToggleButton) {
        setMobileDropdownOpen(false);
      }
    };

    // Add event listener to document to catch all clicks
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mobileDropdownOpen, setMobileDropdownOpen]);

  if (!isVisible) return null;

  const tabs = [
    { id: 'files' as const, label: 'Files', icon: IconFiles, component: FileExplorer },
    { id: 'outline' as const, label: 'Outline', icon: IconList, component: TOC },
    { id: 'graph' as const, label: 'Graph', icon: IconNetwork, component: LocalGraph },
    { id: 'tags' as const, label: 'Tags', icon: IconTags, component: TagsPanel },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeMobileTab)?.component || FileExplorer;

  return (
    <div 
      ref={overlayRef}
      className="absolute left-0 right-0 z-50 bg-black/30" 
      style={{ top: '100%', bottom: 0 }}
    >
      {/* Dropdown Content */}
      <div 
        ref={contentRef}
        className="absolute top-0 left-0 right-0 w-screen bg-[var(--background-primary)] border-b border-[var(--background-modifier-border)] shadow-lg max-h-[60vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxHeight: isAnimating ? '60vh' : '0',
          opacity: isAnimating ? 1 : 0,
          transition: 'max-height 0.2s ease-out, opacity 0.2s ease-out',
          marginLeft: 0,
          marginRight: 0,
          overflow: 'hidden'
        }}
      >
        {/* Handle indicator */}
        <div className="flex justify-center py-2">
          <div className="w-8 h-1 bg-[var(--background-modifier-border)] rounded-full" />
        </div>

        {/* Tab Bar */}
        <div className="border-b border-[var(--background-modifier-border)] bg-[var(--background-secondary)] p-2">
          <Button.Group>
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => setActiveMobileTab(tab.id)}
                variant={activeMobileTab === tab.id ? 'filled' : 'light'}
                size="compact-md"
                flex={1}
                styles={{
                  inner: {
                    flexDirection: 'column',
                    gap: '4px'
                  },
                  label: {
                    fontSize: '12px'
                  }
                }}
              >
                <tab.icon size={18} />
                {tab.label}
              </Button>
            ))}
          </Button.Group>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          <ActiveComponent />
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}