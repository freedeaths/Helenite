import { IconMenu2 } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';

export function MobileNavBar() {
  const {
    mobileDrawerOpen,
    setMobileDrawerOpen,
    activeMobileTab,
    setActiveMobileTab
  } = useUIStore();

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };

  return (
    <div className="h-12 bg-[var(--background-secondary)] border-b border-[var(--background-modifier-border)] flex items-center px-4">
      {/* Drawer toggle */}
      <button
        onClick={handleDrawerToggle}
        className={`
          p-2 rounded-md transition-colors
          ${mobileDrawerOpen 
            ? 'bg-[var(--interactive-accent)] text-white' 
            : 'text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'
          }
        `}
        aria-label="Toggle navigation drawer"
      >
        <IconMenu2 size={20} />
      </button>

      {/* Center - App title */}
      <div className="flex-1 text-center">
        <p className="text-sm font-normal text-[var(--text-normal)]">
          Helenite
        </p>
      </div>

      {/* Placeholder for balance */}
      <div className="w-10 h-10"></div>
    </div>
  );
}