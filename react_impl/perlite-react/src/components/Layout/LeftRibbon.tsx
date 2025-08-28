import { IconFiles, IconNetwork, IconDice, IconHome, IconSettings, IconMoon, IconSun } from '@tabler/icons-react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { useUIStore } from '../../stores/uiStore';
import { useVaultStore } from '../../stores/vaultStore';
import { getVaultConfig } from '../../config/vaultConfig';
import { navigateToFile, navigateToGlobalGraph, getCurrentRoute } from '../../utils/routeUtils';
import { useState, useCallback, useEffect } from 'react';
import type { FileTree } from '../../types/vault';

export function LeftRibbon() {
  const { 
    toggleLeftSidebar, 
    leftSidebarOpen,
    mainContentView,
    setMainContentView
  } = useUIStore();
  const { activeFile, files } = useVaultStore();
  
  const [isDark, setIsDark] = useState(false);
  const [lastClickedButton, setLastClickedButton] = useState<string>('files'); // 默认 files 按钮激活

  // 监听 URL 变化，同步按钮状态（用于直接访问 URL 的情况）
  useEffect(() => {
    const handleRouteChange = () => {
      const route = getCurrentRoute();
      console.log('🔄 Route changed:', route);
      // 只处理图谱路由的特殊情况
      if (route.type === 'global-graph') {
        console.log('🔄 Setting graph button active');
        setLastClickedButton('graph');
      }
      // 其他路由保持用户的点击状态不变
    };

    // 初始化时执行一次
    handleRouteChange();
    
    // 监听 hash 变化（用于处理直接在地址栏输入 URL 的情况）
    window.addEventListener('hashchange', handleRouteChange);
    
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);
  
  // 监听 mainContentView 变化，当通过其他方式切换到 globalGraph 时也要同步按钮状态
  useEffect(() => {
    if (mainContentView === 'globalGraph') {
      setLastClickedButton('graph');
    }
  }, [mainContentView]);
  
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

  // 从文件树中收集所有 markdown 文件
  const collectMarkdownFiles = (fileNodes: FileTree[]): string[] => {
    const mdFiles: string[] = [];
    
    const traverse = (nodes: FileTree[]) => {
      for (const node of nodes) {
        if (node.type === 'file' && node.path.endsWith('.md')) {
          mdFiles.push(node.path);
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    
    traverse(fileNodes);
    return mdFiles;
  };

  // 随机打开一篇文章
  const openRandomNote = () => {
    const allMarkdownFiles = collectMarkdownFiles(files);
    
    if (allMarkdownFiles.length === 0) {
      console.warn('No markdown files found in vault');
      return;
    }
    
    // 排除当前文件，避免重复选择
    const availableFiles = allMarkdownFiles.filter(file => file !== activeFile);
    const filesToChooseFrom = availableFiles.length > 0 ? availableFiles : allMarkdownFiles;
    
    // 随机选择一个文件
    const randomIndex = Math.floor(Math.random() * filesToChooseFrom.length);
    const randomFile = filesToChooseFrom[randomIndex];
    
    console.log(`🎲 Opening random note: ${randomFile}`);
    navigateToFile(randomFile);
    // setMainContentView('file'); // 这个在 onClick 中处理
  };

  const ribbonItems = [
    {
      id: 'home',
      icon: IconHome,
      label: 'Home',
      onClick: () => {
        // Navigate to configured index file with URL update
        const config = getVaultConfig();
        navigateToFile(config.indexFile);
        setMainContentView('file');
        setLastClickedButton('home');
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
        setLastClickedButton('files');
      }
    },
    {
      id: 'graph',
      icon: IconNetwork,
      label: 'Graph View',
      onClick: () => {
        console.log('🔄 Graph button clicked, switching to globalGraph view');
        // Always go to graph view when clicked
        setMainContentView('globalGraph');
        navigateToGlobalGraph();
        setLastClickedButton('graph');
      }
    },
    {
      id: 'random',
      icon: IconDice,
      label: 'Random Note',
      onClick: () => {
        openRandomNote();
        setMainContentView('file');
        setLastClickedButton('random');
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
          
          // 简单逻辑：只有最后点击的按钮是激活的
          const isActive = item.id === lastClickedButton;
          
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