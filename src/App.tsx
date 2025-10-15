import React, { Suspense } from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AppLayout } from './components/Layout/AppLayout';
import { useHashRouter } from './hooks/useHashRouter';
import { useSEO } from './hooks/useSEO';
import { useVaultService } from './hooks/useVaultService';

// 条件性懒加载开发工具 - 只在开发环境加载
const DevToolsPanel = import.meta.env.DEV
  ? React.lazy(() =>
      import('./components/DevTools/DevToolsPanel').then((m) => ({ default: m.DevToolsPanel }))
    )
  : React.lazy(() =>
      import('./components/DevTools/NoOpDevTools').then((m) => ({ default: m.DevToolsPanel }))
    );

function App() {
  // 初始化 VaultService 集成
  const { loading, error } = useVaultService();

  // 初始化新的路由系统
  useHashRouter();

  // 初始化新的 SEO 优化
  useSEO();

  // 显示加载状态
  if (loading) {
    return (
      <MantineProvider defaultColorScheme="light">
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontSize: '18px',
          }}
        >
          🚀 初始化新架构 VaultService...
        </div>
      </MantineProvider>
    );
  }

  // 显示错误状态
  if (error) {
    return (
      <MantineProvider defaultColorScheme="light">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            color: 'red',
          }}
        >
          <div>❌ 新架构初始化失败</div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>{error}</div>
        </div>
      </MantineProvider>
    );
  }

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
