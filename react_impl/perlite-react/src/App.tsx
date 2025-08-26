import { MantineProvider } from '@mantine/core';
import { useEffect, useState } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { themeManager } from './utils/themeLoader';
import { 
  createObsidianMantineTheme, 
  setupThemeChangeObserver,
  updateMantineThemeVariables
} from './utils/mantineThemeBridge';

function App() {
  const [mantineTheme, setMantineTheme] = useState(createObsidianMantineTheme);

  useEffect(() => {
    // 应用默认 Obsidian 主题
    themeManager.loadDefaultTheme().catch(console.error);
    
    // 设置主题变化观察器
    setupThemeChangeObserver();
    
    // 初始化 Mantine 主题变量
    updateMantineThemeVariables();
    
    // 监听主题变化，更新 Mantine 主题
    const handleThemeChange = () => {
      setMantineTheme(createObsidianMantineTheme());
    };

    // 监听自定义主题变化事件
    document.addEventListener('obsidian-theme-changed', handleThemeChange);
    
    return () => {
      document.removeEventListener('obsidian-theme-changed', handleThemeChange);
    };
  }, []);

  return (
    <MantineProvider theme={mantineTheme} defaultColorScheme="light">
      <div data-mantine-color-scheme="obsidian">
        <AppLayout />
      </div>
    </MantineProvider>
  );
}

export default App;