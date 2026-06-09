import { Colors } from '@/constants/theme';

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
  return webTheme;
}
