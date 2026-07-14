import { useColorScheme as useRNColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

export function useColorScheme() {
  const themeMode = useSelector((state: RootState) => state.preferences.themeMode);
  const systemScheme = useRNColorScheme();
  return themeMode ?? systemScheme ?? 'light';
}
