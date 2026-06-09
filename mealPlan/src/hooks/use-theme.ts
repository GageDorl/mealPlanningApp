/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useSelector } from 'react-redux';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RootState } from '@/store';

export function useTheme() {
  const userThemeMode = useSelector((state: RootState) => state.preferences.themeMode);
  const deviceScheme = useColorScheme();

  const scheme = userThemeMode ?? (deviceScheme === 'unspecified' ? 'light' : deviceScheme);
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return Colors[theme];
}
