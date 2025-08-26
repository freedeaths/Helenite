import { IconFiles, IconSearch, IconList, IconNetwork, IconTags } from '@tabler/icons-react';
import { useUIStore } from '../../stores/uiStore';

export function MobileNavBar() {
  const {
    mobileLeftDrawerOpen,
    mobileRightDrawerOpen,
    setMobileLeftDrawerOpen,
    setMobileRightDrawerOpen,
    activeLeftPanel,
    activeRightPanel,
    setActiveLeftPanel,
    setActiveRightPanel
  } = useUIStore();

  const handleLeftButtonClick = () => {
    if (mobileLeftDrawerOpen) {
      setMobileLeftDrawerOpen(false);
    } else {
      setMobileLeftDrawerOpen(true);
      setMobileRightDrawerOpen(false); // Close right drawer if open
    }
  };

  const handleRightButtonClick = () => {
    if (mobileRightDrawerOpen) {
      setMobileRightDrawerOpen(false);
    } else {
      setMobileRightDrawerOpen(true);
      setMobileLeftDrawerOpen(false); // Close left drawer if open
    }
  };

  const getLeftIcon = () => {
    switch (activeLeftPanel) {
      case 'files':
        return <IconFiles size={20} />;
      case 'search':
        return <IconSearch size={20} />;
      default:
        return <IconFiles size={20} />;
    }
  };

  const getRightIcon = () => {
    switch (activeRightPanel) {
      case 'outline':
        return <IconList size={20} />;
      case 'graph':
        return <IconNetwork size={20} />;
      case 'tags':
        return <IconTags size={20} />;
      default:
        return <IconList size={20} />;
    }
  };

  return (
    <div className="h-12 bg-[var(--background-secondary)] border-b border-[var(--background-modifier-border)] flex items-center px-4">
      {/* Left sidebar toggle */}
      <button
        onClick={handleLeftButtonClick}
        className={`
          p-2 rounded-md transition-colors
          ${mobileLeftDrawerOpen 
            ? 'bg-[var(--interactive-accent)] text-white' 
            : 'text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'
          }
        `}
        aria-label="Toggle left sidebar"
      >
        {getLeftIcon()}
      </button>

      {/* Center - App title */}
      <div className="flex-1 text-center">
        <h1 className="text-sm font-medium text-[var(--text-normal)]">
          Perlite
        </h1>
      </div>

      {/* Right sidebar toggle */}
      <button
        onClick={handleRightButtonClick}
        className={`
          p-2 rounded-md transition-colors
          ${mobileRightDrawerOpen 
            ? 'bg-[var(--interactive-accent)] text-white' 
            : 'text-[var(--text-muted)] hover:text-[var(--text-normal)] hover:bg-[var(--background-modifier-hover)]'
          }
        `}
        aria-label="Toggle right sidebar"
      >
        {getRightIcon()}
      </button>
    </div>
  );
}