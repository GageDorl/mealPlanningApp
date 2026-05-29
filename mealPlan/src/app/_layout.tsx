import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Slot } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Provider } from 'react-redux';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { PowerSyncProvider } from '@/services/powersync';
import { store } from '@/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PowerSyncProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
                <Slot />
              </SafeAreaView>
            </ThemeProvider>
          </PowerSyncProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
