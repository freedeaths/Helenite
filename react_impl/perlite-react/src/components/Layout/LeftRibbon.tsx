import { IconFiles, IconSearch, IconNetwork, IconDice, IconHome } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';

export function LeftRibbon() {
  const { 
    toggleLeftSidebar, 
    activeLeftPanel,
    setActiveLeftPanel,
    leftSidebarOpen
  } = useUIStore();

  const ribbonItems = [
    {
      id: 'home',
      icon: IconHome,
      label: 'Home',
      onClick: () => {
        // Navigate to home or welcome page
      }
    },
    {
      id: 'files',
      icon: IconFiles,
      label: 'File Explorer',
      onClick: () => {
        setActiveLeftPanel('files');
        if (!leftSidebarOpen) {
          toggleLeftSidebar();
        }
      }
    },
    {
      id: 'search',
      icon: IconSearch,
      label: 'Search',
      onClick: () => {
        setActiveLeftPanel('search');
        if (!leftSidebarOpen) {
          toggleLeftSidebar();
        }
      }
    },
    {
      id: 'graph',
      icon: IconNetwork,
      label: 'Graph View',
      onClick: () => {
        // Open graph view - could be a modal or replace main content
      }
    },
    {
      id: 'random',
      icon: IconDice,
      label: 'Random Note',
      onClick: () => {
        // Open random note functionality
      }
    }
  ];

  return (
    <div className="w-12 h-full bg-[var(--background-secondary)] border-r border-[var(--background-modifier-border)] flex flex-col items-center py-2">
      {/* Logo/Brand */}
      <div className="mb-4 p-2">
        <div className="w-6 h-6 bg-[var(--interactive-accent)] rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">P</span>
        </div>
      </div>

      {/* Ribbon Items */}
      <div className="flex flex-col space-y-1">
        {ribbonItems.map((item) => {
          const Icon = item.icon;
          const isActive = (item.id === 'files' && activeLeftPanel === 'files') || 
                          (item.id === 'search' && activeLeftPanel === 'search');
          
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`
                p-2 rounded-md transition-all duration-200
                ${isActive 
                  ? 'bg-[var(--interactive-accent)] text-white shadow-sm' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'
                }
                focus:outline-none focus:ring-2 focus:ring-[var(--interactive-accent)] focus:ring-opacity-50
              `}
              title={item.label}
              aria-label={item.label}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom items */}
      <div className="flex flex-col space-y-1">
        <button
          className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)] transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="m12 1 1.27 3.86a9 9 0 0 1 1.19.45l3.68-1.79 1.41 2.45-2.97 2.49a9 9 0 0 1 0 1.9l2.97 2.49-1.41 2.45-3.68-1.79a9 9 0 0 1-1.19.45L12 23l-1.27-3.86a9 9 0 0 1-1.19-.45l-3.68 1.79-1.41-2.45 2.97-2.49a9 9 0 0 1 0-1.9L4.45 11.1l1.41-2.45 3.68 1.79a9 9 0 0 1 1.19-.45L12 1Z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}