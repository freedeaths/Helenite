import { MantineProvider } from '@mantine/core';
import { AppLayout } from './components/Layout/AppLayout';

function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <AppLayout />
    </MantineProvider>
  );
}

export default App;