import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { AppLayout } from './components/Layout/AppLayout';
import { useHashRouter } from './hooks/useHashRouter';
import { useSEO } from './hooks/useSEO';

function App() {
  // 初始化路由系统
  useHashRouter();
  
  // 初始化 SEO 优化
  useSEO();
  
  return (
    <MantineProvider defaultColorScheme="light">
      <Notifications />
      <AppLayout />
    </MantineProvider>
  );
}

export default App;