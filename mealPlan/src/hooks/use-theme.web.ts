import { Colors } from '@/constants/theme';

const webTheme = {
  text: 'var(--color-text)',
  background: 'var(--color-background)',
  backgroundElement: 'var(--color-background-element)',
  backgroundSelected: 'var(--color-background-selected)',
  textSecondary: 'var(--color-text-secondary)',
  border: 'var(--color-border)',
} satisfies typeof Colors.light;

export function useTheme() {
  return webTheme;
}
