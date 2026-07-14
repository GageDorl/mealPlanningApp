import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Colors } from '@/constants/theme';
import type { RootState } from '@/store';

const webTheme = {
  text: 'var(--color-text)',
  background: 'var(--color-background)',
  backgroundElement: 'var(--color-background-element)',
  backgroundSelected: 'var(--color-background-selected)',
  textSecondary: 'var(--color-text-secondary)',
  border: 'var(--color-border)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
} satisfies Record<keyof typeof Colors.light, string>;

export function useTheme() {
  const themeMode = useSelector((state: RootState) => state.preferences.themeMode);

  useEffect(() => {
    if (themeMode === null) {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeMode);
    }
  }, [themeMode]);

  return webTheme;
}
