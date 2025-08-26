import { MantineProvider } from '@mantine/core';
import { useEffect } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { themeManager } from './utils/themeLoader';

function App() {
  useEffect(() => {
    // 应用默认 Obsidian 主题
    themeManager.loadDefaultTheme().catch(console.error);
  }, []);

  return (
    <MantineProvider>
      <AppLayout />
    </MantineProvider>
  );
}

export default App;