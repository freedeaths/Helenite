import React, { Suspense } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AppLayout } from './components/Layout/AppLayout';
import { useHashRouter } from './hooks/useHashRouter';
import { useSEO } from './hooks/useSEO';

// 条件性懒加载开发工具 - 只在开发环境加载
const DevToolsPanel = import.meta.env.DEV
  ? React.lazy(() => import('./components/DevTools/DevToolsPanel').then(m => ({ default: m.DevToolsPanel })))
  : React.lazy(() => import('./components/DevTools/NoOpDevTools').then(m => ({ default: m.DevToolsPanel })));

function App() {
  // 初始化路由系统
  useHashRouter();

  // 初始化 SEO 优化
  useSEO();

  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications />
      <AppLayout />
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <DevToolsPanel />
        </Suspense>
      )}
    </MantineProvider>
  );
}

export default App;