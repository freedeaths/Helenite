import { IconDice, IconHome, IconSettings, IconMoon, IconSun } from '@tabler/icons-react';
import { LuFolderTree } from "react-icons/lu";
import { PiGraphFill } from "react-icons/pi";
import { ActionIcon, Tooltip } from '@mantine/core';
import { useNewUIStore } from '../../newStores/newUIStore';
import { useNewVaultStore } from '../../newStores/newVaultStore';
import { getVaultConfig } from '../../config/vaultConfig';
import { useState, useCallback, useEffect } from 'react';

export function NewLeftRibbon() {
  const {
    leftSidebarOpen,
    toggleLeftSidebar,
    theme,
    setTheme,
    mainContentView,
    setMainContentView
  } = useNewUIStore();
  const {
    activeFile,
    fileTree,
    navigateToFile,
    navigateToGraph,
    currentRoute
  } = useNewVaultStore();

  const [lastClickedButton, setLastClickedButton] = useState<string>('files');

  // Initialize theme attribute on component mount and when theme changes
  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  // 监听路由变化，同步按钮状态（用于直接访问 URL 的情况）
  useEffect(() => {
    const handleRouteChange = () => {
      console.log('🔄 New Route changed:', currentRoute);
      // 处理图谱路由的特殊情况
      if (currentRoute?.type === 'graph') {
        console.log('🔄 Setting graph button active');
        setLastClickedButton('graph');
      }
      // 其他路由保持用户的点击状态不变
    };

    // 初始化时执行一次
    handleRouteChange();
  }, [currentRoute]);

  // 监听 mainContentView 变化，当通过其他方式切换到 globalGraph 时也要同步按钮状态
  useEffect(() => {
    if (mainContentView === 'globalGraph') {
      setLastClickedButton('graph');
    }
  }, [mainContentView]);

  const toggleThemeHandler = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    // Apply theme to body
    document.body.setAttribute('data-theme', newTheme);

    // Trigger theme change event for other components
    document.dispatchEvent(new CustomEvent('obsidian-theme-changed', {
      detail: { theme: newTheme }
    }));
  }, [theme, setTheme]);

  // 从文件树中收集所有 markdown 文件
  const collectMarkdownFiles = (fileNodes: any[]): string[] => {
    const mdFiles: string[] = [];

    const traverse = (nodes: any[]) => {
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
    const allMarkdownFiles = collectMarkdownFiles(fileTree);

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
  };

  const ribbonItems = [
    {
      id: 'home',
      icon: IconHome,
      label: 'Home',
      onClick: () => {
        // Navigate to configured index file with URL update (复制老版本逻辑)
        const config = getVaultConfig();
        navigateToFile(config.indexFile);
        setMainContentView('file');
        setLastClickedButton('home');
      }
    },
    {
      id: 'files',
      icon: LuFolderTree,
      label: 'File Explorer',
      onClick: () => {
        // 切换到文件视图并打开文件浏览器（复制老版本逻辑）
        setMainContentView('file');
        if (!leftSidebarOpen) {
          toggleLeftSidebar();
        }
        setLastClickedButton('files');
      }
    },
    {
      id: 'graph',
      icon: PiGraphFill,
      label: 'Graph View',
      onClick: () => {
        console.log('🔄 Graph button clicked, switching to globalGraph view');
        // Always go to graph view when clicked（复制老版本逻辑）
        setMainContentView('globalGraph');
        navigateToGraph();
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
    <div className="w-12 h-full bg-[var(--background-ribbon)] flex flex-col items-center py-2 overflow-hidden">
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
        <Tooltip label={theme === 'dark' ? "Light Theme" : "Dark Theme"} position="right" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            radius="md"
            onClick={toggleThemeHandler}
          >
            {theme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
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