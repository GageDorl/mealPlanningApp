import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  accent: '#FF6B2C',
  accentLight: '#FF8F5C',
  accentDark: '#CC5623',

  light: {
    text: '#1A1A1A',
    background: '#FFFFFF',
    backgroundElement: '#F5F5F7',
    backgroundSelected: '#E8E8EC',
    textSecondary: '#6B6E76',
    border: '#E0E0E4',
    success: '#34C759',
    warning: '#FFB800',
    error: '#FF3B30',
  },
  dark: {
    text: '#F5F5F7',
    background: '#0A0A0A',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2C2C2E',
    textSecondary: '#98989F',
    border: '#38383A',
    success: '#30D158',
    warning: '#FFD60A',
    error: '#FF453A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Futura',
    sansBody: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    sansBody: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: '"Futura", "Century Gothic", "Trebuchet MS", sans-serif',
    sansBody: 'system-ui, -apple-system, sans-serif',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  hero: 34,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const MaxContentWidth = 800;
