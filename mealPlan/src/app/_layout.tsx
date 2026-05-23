import type { ReactNode } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Provider } from 'react-redux';

import { PowerSyncProvider } from '@/services/powersync';
import { store } from '@/store';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <PowerSyncProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {children}
        </ThemeProvider>
      </PowerSyncProvider>
    </Provider>
  );
}
