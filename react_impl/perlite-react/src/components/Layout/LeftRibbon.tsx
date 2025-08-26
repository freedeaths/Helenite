import { IconFiles, IconNetwork, IconDice, IconHome, IconSettings, IconDiamond } from '@tabler/icons-react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';

export function LeftRibbon() {
  const { 
    toggleLeftSidebar, 
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
          const isActive = item.id === 'files' && leftSidebarOpen;
          
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