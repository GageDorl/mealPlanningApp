import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Slot } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

if (__DEV__ && Platform.OS === 'web') {
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('Unknown event handler property') || msg.includes('TouchableMixin')) return;
    original(...args);
  };
}

import { PowerSyncProvider } from '@/services/powersync';
import { supabase } from '@/services/supabase';
import { getProfile } from '@/services/user-service';
import { store } from '@/store';
import { setThemeMode } from '@/store/slices/preferences-slice';
import type { RootState } from '@/store';
import { LoadingProvider } from '@/contexts/loading-context';
import { SessionProvider } from '@/contexts/session-context';
import { RefreshProvider } from '@/contexts/refresh-context';

function LayoutContent() {
  const colorScheme = useColorScheme();
  const dispatch = useDispatch();
  const userThemeMode = useSelector((state: RootState) => state.preferences.themeMode);

  useEffect(() => {
    const loadUserTheme = async () => {
      const sessionResult = await supabase.auth.getSession();
      const userId = sessionResult.data.session?.user.id;

      if (userId) {
        const profile = await getProfile(userId);
        if (profile?.user.theme_preference) {
          dispatch(setThemeMode(profile.user.theme_preference));
        }
      }
    };

    loadUserTheme();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user.id) {
        const profile = await getProfile(session.user.id);
        if (profile?.user.theme_preference) {
          dispatch(setThemeMode(profile.user.theme_preference));
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [dispatch]);

  const theme = userThemeMode ? (userThemeMode === 'dark' ? DarkTheme : DefaultTheme) : (colorScheme === 'dark' ? DarkTheme : DefaultTheme);

  return (
    <ThemeProvider value={theme}>
      <LoadingProvider>
        <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
          <Slot />
        </SafeAreaView>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PowerSyncProvider>
            <SessionProvider>
              <RefreshProvider>
                <LayoutContent />
              </RefreshProvider>
            </SessionProvider>
          </PowerSyncProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
