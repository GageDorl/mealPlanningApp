import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Slot } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Provider } from 'react-redux';

import { PowerSyncProvider } from '@/services/powersync';
import { store } from '@/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <PowerSyncProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Slot />
        </ThemeProvider>
      </PowerSyncProvider>
    </Provider>
  );
}
