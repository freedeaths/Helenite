import { IconFiles, IconNetwork, IconDice, IconHome, IconSettings, IconMoon, IconSun } from '@tabler/icons-react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { useState, useCallback } from 'react';

export function LeftRibbon() {
  const { 
    toggleLeftSidebar, 
    leftSidebarOpen,
    mainContentView,
    setMainContentView
  } = useUIStore();
  
  const [isDark, setIsDark] = useState(false);
  
  const toggleTheme = useCallback(() => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    // Apply theme to body
    document.body.setAttribute('data-theme', newTheme ? 'dark' : 'light');
    
    // Trigger theme change event for other components
    document.dispatchEvent(new CustomEvent('obsidian-theme-changed', { 
      detail: { theme: newTheme ? 'dark' : 'light' } 
    }));
  }, [isDark]);

  const ribbonItems = [
    {
      id: 'home',
      icon: IconHome,
      label: 'Home',
      onClick: () => {
        // Navigate to home or welcome page
        setMainContentView('file');
      }
    },
    {
      id: 'files',
      icon: IconFiles,
      label: 'File Explorer',
      onClick: () => {
        // 切换到文件视图并打开文件浏览器
        setMainContentView('file');
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
        console.log('🔄 Graph button clicked, current view:', mainContentView);
        // Toggle between graph view and file view
        if (mainContentView === 'globalGraph') {
          console.log('🔄 Switching to file view');
          setMainContentView('file');
        } else {
          console.log('🔄 Switching to globalGraph view');
          setMainContentView('globalGraph');
        }
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
    <div className="w-12 h-full bg-[var(--background-secondary)] border-r border-[var(--background-modifier-border)] flex flex-col items-center py-2 overflow-hidden">
      {/* Logo/Brand - 小尺寸 */}
      <div className="mb-2 flex items-center justify-center w-8 h-8">
        <img 
          src="/obsidian-svgrepo.svg" 
          alt="Obsidian Logo" 
          className="w-4 h-4 flex-shrink-0" 
          style={{ 
            filter: 'invert(0.7)',
            width: '32px',
            height: '32px',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Ribbon Items */}
      <div className="flex flex-col gap-1">
        {ribbonItems.map((item) => {
          const Icon = item.icon;
          const isActive = 
            (item.id === 'files' && leftSidebarOpen && mainContentView === 'file') ||
            (item.id === 'graph' && mainContentView === 'globalGraph') ||
            (item.id === 'home' && mainContentView === 'file' && !leftSidebarOpen);
          
          return (
            <Tooltip key={item.id} label={item.label} position="right" withArrow>
              <ActionIcon
                onClick={item.onClick}
                variant={isActive ? 'filled' : 'subtle'}
                color={isActive ? 'blue' : 'gray'}
                size="md"
                radius="md"
              >
                <Icon size={16} />
              </ActionIcon>
            </Tooltip>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom items */}
      <div className="flex flex-col gap-1">
        <Tooltip label={isDark ? "Light Theme" : "Dark Theme"} position="right" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="md"
            onClick={toggleTheme}
          >
            {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
          </ActionIcon>
        </Tooltip>
        
        <Tooltip label="Settings" position="right" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="md"
          >
            <IconSettings size={16} />
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
}